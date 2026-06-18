import { IPaymentGateway } from './base';
import { StripeGateway } from './stripe';
import { RazorpayGateway } from './razorpay';
import { AdyenGateway } from './adyen';

export class GatewayFactory {
  private static gateways: Record<string, IPaymentGateway> = {
    Stripe: new StripeGateway(),
    Razorpay: new RazorpayGateway(),
    Adyen: new AdyenGateway(),
  };

  public static getGateway(name: string): IPaymentGateway {
    const gateway = this.gateways[name];
    if (!gateway) {
      throw new Error(`Payment gateway ${name} is not registered or supported.`);
    }
    return gateway;
  }
}
