import { IPaymentGateway, GatewayPaymentRequest, GatewayPaymentResponse, gatewaySimulations } from './base';

export class AdyenGateway implements IPaymentGateway {
  public name = 'Adyen';

  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const sim = gatewaySimulations[this.name];

    if (sim?.simulate5xx) {
      return {
        success: false,
        error: 'Adyen API Gateway Error (502)',
        statusCode: 502
      };
    }

    if (sim?.simulateTimeout) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: false,
        error: 'Adyen Request Timeout (504)',
        statusCode: 504
      };
    }

    await new Promise(resolve => setTimeout(resolve, 700));

    return {
      success: true,
      gatewayTransactionId: `adyen_tx_${Math.random().toString(36).substring(2, 12)}`,
      token: `session_adyen_${Math.random().toString(36).substring(2, 12)}`,
      redirectUrl: 'https://adyen.com/checkout/pay'
    };
  }

  async refundPayment(gatewayTransactionId: string, amount: number): Promise<boolean> {
    return true;
  }
}
