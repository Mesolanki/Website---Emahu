import { IPaymentGateway, GatewayPaymentRequest, GatewayPaymentResponse, gatewaySimulations } from './base';

export class RazorpayGateway implements IPaymentGateway {
  public name = 'Razorpay';

  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const sim = gatewaySimulations[this.name];

    if (sim?.simulate5xx) {
      return {
        success: false,
        error: 'Razorpay Service Unavailable (503)',
        statusCode: 503
      };
    }

    if (sim?.simulateTimeout) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: false,
        error: 'Razorpay Connection Timeout (504)',
        statusCode: 504
      };
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      gatewayTransactionId: `pay_rzp_${Math.random().toString(36).substring(2, 12)}`,
      token: `order_rzp_${Math.random().toString(36).substring(2, 12)}`,
      redirectUrl: 'https://razorpay.com/checkout/pay'
    };
  }

  async refundPayment(gatewayTransactionId: string, amount: number): Promise<boolean> {
    return true;
  }
}
