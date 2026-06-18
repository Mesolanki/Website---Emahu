export interface GatewayPaymentRequest {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  billingEmail: string;
  idempotencyKey: string;
}

export interface GatewayPaymentResponse {
  success: boolean;
  gatewayTransactionId?: string;
  token?: string;
  redirectUrl?: string;
  error?: string;
  statusCode?: number;
}

export interface IPaymentGateway {
  name: string;
  processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;
  refundPayment(gatewayTransactionId: string, amount: number): Promise<boolean>;
}

// In-memory simulation config to trigger PG failures dynamically from the frontend dashboard
export const gatewaySimulations: Record<string, {
  failRate: number; // 0 to 1
  simulate5xx: boolean;
  simulateTimeout: boolean;
}> = {
  Stripe: { failRate: 0, simulate5xx: false, simulateTimeout: false },
  Razorpay: { failRate: 0, simulate5xx: false, simulateTimeout: false },
  Adyen: { failRate: 0, simulate5xx: false, simulateTimeout: false }
};
