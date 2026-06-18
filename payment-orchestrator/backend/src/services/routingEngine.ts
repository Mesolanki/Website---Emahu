import { PrismaClient, PaymentGatewayRegistry } from '@prisma/client';
import { circuitBreakerManager } from './circuitBreaker';

const prisma = new PrismaClient();

export interface RoutingEngineOptions {
  country: string;
  paymentMethodType: string; // e.g. "CARD", "UPI", "WALLET", "NETBANKING", "BNPL"
}

export class RoutingEngine {
  /**
   * Evaluates available payment gateways and returns a sorted list of optimal PGs
   * from primary to fallbacks.
   */
  public static async selectOptimalRoute(options: RoutingEngineOptions): Promise<PaymentGatewayRegistry[]> {
    const { country, paymentMethodType } = options;

    // Fetch all active gateways
    const gateways = await prisma.paymentGatewayRegistry.findMany({
      where: { isActive: true },
    });

    const eligibleGateways = gateways.filter((gateway) => {
      // 1. Check if PG supports the specific payment method type (e.g. UPI, CARD)
      const methods = gateway.supportedMethods.split(',').map(m => m.trim().toUpperCase());
      if (!methods.includes(paymentMethodType.toUpperCase())) {
        return false;
      }

      // 2. Check if PG supports the target country code
      const countries = gateway.supportedCountries.split(',').map(c => c.trim().toUpperCase());
      const supportsCountry = countries.includes('*') || countries.includes(country.toUpperCase());
      if (!supportsCountry) {
        return false;
      }

      // 3. Filter out PGs with OPEN circuit breakers (hard failover prevention)
      const breakerState = circuitBreakerManager.getBreaker(gateway.name).getState();
      if (breakerState === 'OPEN') {
        console.log(`Smart Routing: Filtered out ${gateway.name} due to OPEN circuit breaker.`);
        return false;
      }

      return true;
    });

    // 4. Score and sort eligible gateways
    // Score Formula: Priority (50% weight) + Success Rate (40% weight) - Processing Fee (10% weight)
    const scoredGateways = eligibleGateways.map((gateway) => {
      let score = (gateway.priority * 0.5) + (gateway.successRate * 100 * 0.4) - (gateway.processingFeePercent * 5 * 0.1);

      // Apply a penalty if health status is DEGRADED/HALF_OPEN to limit trial exposure
      const breakerState = circuitBreakerManager.getBreaker(gateway.name).getState();
      if (breakerState === 'HALF_OPEN' || gateway.healthStatus === 'DEGRADED') {
        score *= 0.5; // Reduce score by 50%
      }

      return {
        gateway,
        score,
      };
    });

    // Sort descending by score
    scoredGateways.sort((a, b) => b.score - a.score);

    console.log('Smart Routing Scores:', scoredGateways.map(sg => `${sg.gateway.name}: ${sg.score.toFixed(2)}`));

    return scoredGateways.map((sg) => sg.gateway);
  }
}
