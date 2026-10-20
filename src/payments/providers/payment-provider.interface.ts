
export interface InitiateParams {
  paymentId: string;
  bookingId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
}

export interface InitiateResult {
  transactionId: string;
  redirectUrl?: string;
}

export interface PaymentProviderInterface {
  readonly name: 'MOCK' | 'CLICK' | 'PAYME' | 'UZUM' | 'STRIPE';
  initiate(params: InitiateParams): Promise<InitiateResult>;
}