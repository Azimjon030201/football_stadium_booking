import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentProviderInterface } from './payment-provider.interface';

@Injectable()
export class MockProvider implements PaymentProviderInterface {
  // amount va bookingId haqiqiy provayderlar (Click/Payme) uchun kerak; mockda ishlatilmaydi.
  async initiate(
    _amount: number,
    _bookingId: string,
  ): Promise<{ transactionId: string; status: string }> {
    return { transactionId: `MOCK-${randomUUID()}`, status: 'PENDING' };
  }
}