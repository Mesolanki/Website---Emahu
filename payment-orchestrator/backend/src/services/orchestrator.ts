import { PrismaClient, Transaction } from '@prisma/client';
import { RoutingEngine } from './routingEngine';
import { GatewayFactory } from './gateways/factory';
import { circuitBreakerManager } from './circuitBreaker';
import { GatewayPaymentRequest, GatewayPaymentResponse } from './gateways/base';

const prisma = new PrismaClient();

export interface PaymentInitiationRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentMethodType: string; // e.g. CARD, UPI, WALLET
  billingEmail: string;
  country: string;
  state: string;
  zip: string;
  idempotencyKey: string;
}

export interface OrchestrationResult {
  transaction: Transaction;
  success: boolean;
  gatewayResponse?: GatewayPaymentResponse;
  routingTrace: string[];
}

export class PaymentOrchestrator {
  public static async processPayment(req: PaymentInitiationRequest): Promise<OrchestrationResult> {
    const {
      amount,
      currency,
      paymentMethod,
      paymentMethodType,
      billingEmail,
      country,
      state,
      zip,
      idempotencyKey,
    } = req;

    // 1. Idempotency Check & Transaction Locking
    let transaction = await prisma.transaction.findUnique({
      where: { idempotencyKey },
    });

    if (transaction) {
      console.log(`PaymentOrchestrator: Duplicate transaction found for idempotency key: ${idempotencyKey}`);
      return {
        transaction,
        success: transaction.status === 'SUCCESS',
        routingTrace: transaction.pgTried.split(','),
      };
    }

    // Initialize transaction in database
    transaction = await prisma.transaction.create({
      data: {
        amount,
        currency,
        status: 'INITIATED',
        paymentMethod,
        billingCountry: country,
        billingState: state,
        billingZip: zip,
        idempotencyKey,
        pgTried: '',
        activePgId: null,
      },
    });

    // 2. Select Gateway Routes dynamically
    const optimalRoute = await RoutingEngine.selectOptimalRoute({
      country,
      paymentMethodType,
    });

    if (optimalRoute.length === 0) {
      const errorMsg = 'No active payment gateways are available for this location and payment method.';
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          failureReason: errorMsg,
        },
      });
      return { transaction, success: false, routingTrace: [] };
    }

    const routingTrace: string[] = [];
    let activeResponse: GatewayPaymentResponse | undefined;

    // 3. Failover Execution Loop
    for (let i = 0; i < optimalRoute.length; i++) {
      const currentGateway = optimalRoute[i];
      routingTrace.push(currentGateway.name);

      console.log(`PaymentOrchestrator: Attempting payment via primary/fallback gateway: ${currentGateway.name}`);

      // Update transaction log in DB
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          pgTried: routingTrace.join(','),
          activePgId: currentGateway.id,
        },
      });

      const gatewayStrategy = GatewayFactory.getGateway(currentGateway.name);
      const breaker = circuitBreakerManager.getBreaker(currentGateway.name);

      try {
        const payload: GatewayPaymentRequest = {
          transactionId: transaction.id,
          amount,
          currency,
          paymentMethod,
          billingEmail,
          idempotencyKey,
        };

        // Call the gateway interface
        activeResponse = await gatewayStrategy.processPayment(payload);

        if (activeResponse.success) {
          // Success case
          console.log(`PaymentOrchestrator: Payment succeeded on gateway ${currentGateway.name}`);
          
          // Record success in Circuit Breaker
          await breaker.recordSuccess();

          // Update Transaction state to SUCCESS (or PENDING if redirect/3DS required)
          transaction = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'SUCCESS',
              failureReason: null,
            },
          });

          return {
            transaction,
            success: true,
            gatewayResponse: activeResponse,
            routingTrace,
          };
        } else {
          // Gateway returned a failure or transient error
          const code = activeResponse.statusCode || 500;
          console.warn(`PaymentOrchestrator: Gateway ${currentGateway.name} failed with code: ${code}. Error: ${activeResponse.error}`);

          // Trip Circuit Breaker if failure was a server issue (5xx) or timeout
          if (code >= 500 || code === 408) {
            await breaker.recordFailure();
          }

          // Continue loop to fallback gateway (Failover)
        }
      } catch (err: any) {
        console.error(`PaymentOrchestrator: Unexpected exception during gateway call to ${currentGateway.name}:`, err);
        await breaker.recordFailure();
        // Continue loop to fallback gateway
      }
    }

    // 4. All Gateways Failed
    const finalError = activeResponse?.error || 'All routed payment gateways failed to process the transaction.';
    transaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        failureReason: finalError,
      },
    });

    return {
      transaction,
      success: false,
      gatewayResponse: activeResponse,
      routingTrace,
    };
  }
}
