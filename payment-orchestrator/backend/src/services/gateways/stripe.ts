import { IPaymentGateway, GatewayPaymentRequest, GatewayPaymentResponse, gatewaySimulations } from './base';

export class StripeGateway implements IPaymentGateway {
  public name = 'Stripe';

  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const sim = gatewaySimulations[this.name];

    // Simulate configured gateway failures
    if (sim?.simulate5xx) {
      return {
        success: false,
        error: 'Stripe Internal Server Error (500)',
        statusCode: 500
      };
    }

    if (sim?.simulateTimeout) {
      // Wait for a simulated long duration, then throw a mock timeout error
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: false,
        error: 'Stripe Gateway Gateway Timeout (504)',
        statusCode: 504
      };
    }

    // Simulate default processing delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Simulate processing success
    return {
      success: true,
      gatewayTransactionId: `ch_stripe_${Math.random().toString(36).substring(2, 12)}`,
      token: `tok_stripe_${Math.random().toString(36).substring(2, 12)}`,
      redirectUrl: 'https://stripe.com/checkout/pay'
    };
  }

  async refundPayment(gatewayTransactionId: string, amount: number): Promise<boolean> {
    return true;
  }
}
