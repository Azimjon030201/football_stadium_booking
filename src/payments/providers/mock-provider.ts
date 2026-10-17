import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  InitiatePaymentResult,
  PaymentProviderInterface,
} from './payment-provider.interface';

@Injectable()
export class MockProvider implements PaymentProviderInterface {
  readonly name = 'MOCK' as const;

  async initiate(_amount: number, _bookingId: string): Promise<InitiatePaymentResult> {
    // Real provayderda tashqi API'ga so'rov ketadi va natija webhook orqali keladi.
    // Mock: darhol SUCCESS.
    return { transactionId: `mock-tx-${uuidv4()}`, status: 'SUCCESS' };
  }

  async refund(_transactionId: string, _amount: number) {
    return { status: 'REFUNDED' as const }; // mock: refund darhol
  }
}