import { PaymentProviderType } from '@prisma/client';

export interface InitiateProviderInput {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface InitiateProviderResult {
  transactionId: string;
  redirectUrl?: string | null;
}

// Strategy pattern (SRS 15.1): yangi provider = yangi klass, core logika o'zgarmaydi
export interface PaymentProvider {
  readonly type: PaymentProviderType;
  initiate(input: InitiateProviderInput): Promise<InitiateProviderResult>;
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;
}