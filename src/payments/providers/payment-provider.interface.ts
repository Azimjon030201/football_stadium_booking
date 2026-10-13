export type ProviderPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface InitiatePaymentResult {
  transactionId: string;
  status: ProviderPaymentStatus;
}

export interface RefundResult {
  status: 'REFUNDED' | 'FAILED';
}

export interface PaymentProviderInterface {
  readonly name: string;

  initiate(amount: number, bookingId: string): Promise<InitiatePaymentResult>;

  refund(transactionId: string, amount: number): Promise<RefundResult>;
}