import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  InitiateParams,
  InitiateResult,
  PaymentProviderInterface,
} from './payment-provider.interface';

@Injectable()
export class MockProvider implements PaymentProviderInterface {
  readonly name = 'MOCK';

  // Mock: darhol transactionId. Natija webhook orqali (Postman) keladi.
  async initiate(_params: InitiateParams): Promise<InitiateResult> {
    return { transactionId: `mock-tx-${randomUUID()}` };
  }

  verifySignature(rawBody: Buffer | string | undefined, signature?: string): boolean {
    // Faqat dev/Postman uchun; productionda hech qachon yoqilmaydi
    if (
      process.env.PAYMENT_WEBHOOK_SKIP_SIGNATURE === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }
    if (!rawBody || !signature) return false;
    const expected = createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET ?? '')
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // Mock providerda refund darhol muvaffaqiyatli (TZ 15.4)
  async refund(_transactionId?: string): Promise<void> {
    return;
  }
}