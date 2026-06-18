import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { PaymentOrchestrator } from '../services/orchestrator';
import { gatewaySimulations } from '../services/gateways/base';
import { circuitBreakerManager } from '../services/circuitBreaker';
import { lockManager } from '../services/lockManager';

const prisma = new PrismaClient();

// Zod Input Validations
const PaymentInitiateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.string(),
  paymentMethodType: z.string(),
  billingEmail: z.string().email(),
  country: z.string(),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  idempotencyKey: z.string(),
});

export class PaymentController {
  /**
   * Initiate a payment transaction through the orchestrator.
   */
  public static async initiate(req: Request, res: Response) {
    try {
      const parsed = PaymentInitiateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const result = await PaymentOrchestrator.processPayment(parsed.data);

      return res.status(result.success ? 200 : 422).json(result);
    } catch (error: any) {
      console.error('Payment controller error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error processing payment' });
    }
  }

  /**
   * Returns current active payment methods based on resolved location.
   */
  public static getMethodsForLocation(req: Request, res: Response) {
    const { resolvedLocation, availablePaymentMethods, deliveryPricing } = req.body;
    return res.json({
      location: resolvedLocation,
      paymentMethods: availablePaymentMethods,
      deliveryPricing,
    });
  }

  /**
   * Returns current gateway registry statuses and in-memory circuit breaker states.
   */
  public static async getRegistry(req: Request, res: Response) {
    try {
      const registry = await prisma.paymentGatewayRegistry.findMany({});
      const cbStates = circuitBreakerManager.getStatesReport();

      const details = registry.map((gw) => ({
        ...gw,
        circuitBreakerState: cbStates[gw.name] || 'CLOSED',
        simulation: gatewaySimulations[gw.name] || { simulate5xx: false, simulateTimeout: false },
      }));

      return res.json(details);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve gateway configurations' });
    }
  }

  /**
   * Configures simulation flags for testing failover scenarios from the dashboard.
   */
  public static configureSimulation(req: Request, res: Response) {
    const { name, simulate5xx, simulateTimeout } = req.body;
    if (!name || !gatewaySimulations[name]) {
      return res.status(400).json({ error: `Invalid or unsupported gateway name: ${name}` });
    }

    gatewaySimulations[name] = {
      failRate: 0,
      simulate5xx: !!simulate5xx,
      simulateTimeout: !!simulateTimeout,
    };

    console.log(`Simulation configured for [${name}]:`, gatewaySimulations[name]);
    return res.json({ message: `Simulation settings updated for ${name}`, settings: gatewaySimulations[name] });
  }

  /**
   * Reset gateway states and circuit breakers for testing convenience.
   */
  public static async resetRegistry(req: Request, res: Response) {
    try {
      await prisma.paymentGatewayRegistry.updateMany({
        data: { healthStatus: 'HEALTHY' },
      });

      // Clear in-memory simulations and breakers
      for (const name of Object.keys(gatewaySimulations)) {
        gatewaySimulations[name] = { failRate: 0, simulate5xx: false, simulateTimeout: false };
        const breaker = circuitBreakerManager.getBreaker(name);
        // Reset breaker states internally by triggering consecutive successes manually
        await breaker.recordSuccess();
        await breaker.recordSuccess();
      }

      await prisma.transaction.deleteMany({});

      return res.json({ message: 'All gateways, circuit breakers, simulations, and transactions reset to default.' });
    } catch (error) {
      return res.status(500).json({ error: 'Reset failed' });
    }
  }

  /**
   * Unified Webhook Listener: Safely updates transaction status with mutex locks.
   */
  public static async webhook(req: Request, res: Response) {
    const { transactionId, status, gateway, signature } = req.body;

    if (!transactionId || !status) {
      return res.status(400).json({ error: 'Webhook payload missing transactionId or status' });
    }

    console.log(`Webhook Received: PG=[${gateway}], Tx=[${transactionId}], Status=[${status}]`);

    // 1. Prevent Double-Spending & Race Conditions using LockManager (Mutex)
    const lockKey = `webhook:lock:${transactionId}`;
    const acquired = await lockManager.acquireLock(lockKey, 5000);
    if (!acquired) {
      console.warn(`Webhook Collision Warning: Webhook processing already in progress for transaction: ${transactionId}`);
      return res.status(409).json({ error: 'Conflict: transaction processing is already locked.' });
    }

    try {
      // 2. Wrap status update in DB Transaction to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
        });

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        // Avoid overwriting a final state (SUCCESS/FAILED)
        if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
          console.log(`Webhook: Transaction ${transactionId} is already in final state: ${transaction.status}`);
          return transaction;
        }

        const updatedTx = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: status.toUpperCase(),
            updatedAt: new Date(),
          },
        });

        return updatedTx;
      });

      return res.json({ message: 'Webhook processed successfully', transaction: result });
    } catch (err: any) {
      console.error(`Webhook processing error for Tx ${transactionId}:`, err.message);
      return res.status(500).json({ error: err.message || 'Webhook handling failed' });
    } finally {
      // 3. Always release lock
      lockManager.releaseLock(lockKey);
    }
  }
}
