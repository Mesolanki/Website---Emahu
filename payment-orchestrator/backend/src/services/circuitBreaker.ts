import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerConfig {
  failureThreshold: number; // number of failures before tripping
  cooldownPeriodMs: number; // time in open state before testing again
  successThreshold: number; // consecutive successes needed in half-open to close
}

class GatewayCircuitBreaker {
  private gatewayName: string;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime?: number;
  private config: BreakerConfig;

  constructor(gatewayName: string, config?: Partial<BreakerConfig>) {
    this.gatewayName = gatewayName;
    this.config = {
      failureThreshold: 3,
      cooldownPeriodMs: 10000, // 10 seconds for testing/simulating easily
      successThreshold: 2,
      ...config,
    };
  }

  public getState(): CircuitBreakerState {
    // Check if cooldown has passed while OPEN, transition to HALF_OPEN
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.cooldownPeriodMs) {
        this.setState('HALF_OPEN');
        console.log(`Circuit Breaker for [${this.gatewayName}] auto-transitioned to HALF_OPEN.`);
      }
    }
    return this.state;
  }

  public async recordSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses += 1;
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        await this.setState('CLOSED');
        console.log(`Circuit Breaker for [${this.gatewayName}] is CLOSED again (PG recovered).`);
      }
    }
  }

  public async recordFailure() {
    this.failureCount += 1;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    const state = this.getState();
    if (state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      await this.setState('OPEN');
      console.warn(`Circuit Breaker for [${this.gatewayName}] tripped to OPEN (too many failures).`);
    } else if (state === 'HALF_OPEN') {
      await this.setState('OPEN');
      console.warn(`Circuit Breaker for [${this.gatewayName}] tripped back to OPEN in HALF_OPEN trial.`);
    }
  }

  private async setState(newState: CircuitBreakerState) {
    this.state = newState;
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.consecutiveSuccesses = 0;
    }

    // Reflect health status in DB Registry to let other services know (or for metrics dashboard)
    try {
      let dbHealth = 'HEALTHY';
      if (newState === 'OPEN') dbHealth = 'UNHEALTHY';
      if (newState === 'HALF_OPEN') dbHealth = 'DEGRADED';

      await prisma.paymentGatewayRegistry.updateMany({
        where: { name: this.gatewayName },
        data: { healthStatus: dbHealth },
      });
    } catch (err) {
      console.error(`Failed to update DB health status for ${this.gatewayName}:`, err);
    }
  }
}

// Global registry of breakers per gateway
class CircuitBreakerManager {
  private breakers: Map<string, GatewayCircuitBreaker> = new Map();

  public getBreaker(gatewayName: string): GatewayCircuitBreaker {
    let breaker = this.breakers.get(gatewayName);
    if (!breaker) {
      breaker = new GatewayCircuitBreaker(gatewayName);
      this.breakers.set(gatewayName, breaker);
    }
    return breaker;
  }

  public getStatesReport(): Record<string, CircuitBreakerState> {
    const report: Record<string, CircuitBreakerState> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      report[name] = breaker.getState();
    }
    return report;
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
