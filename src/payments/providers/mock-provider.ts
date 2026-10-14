import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderType } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  InitiateProviderInput,
  InitiateProviderResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly type = PaymentProviderType.MOCK;

  constructor(private readonly config: ConfigService) {}

  async initiate(_input: InitiateProviderInput): Promise<InitiateProviderResult> {
    // Mock: natija webhook orqali keladi (Postman'dan qo'lda yuboriladi)
    return { transactionId: `mock-${randomUUID()}`, redirectUrl: null };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !rawBody) return false;
    const secret = this.config.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}