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

// Strategy pattern (TZ 15.1): yangi provider = yangi klass
export interface PaymentProviderInterface {
  readonly name: string;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  verifySignature(rawBody: Buffer | string | undefined, signature?: string): boolean;
  refund(transactionId?: string): Promise<void>;
}