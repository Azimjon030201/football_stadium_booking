
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InitiateParams,
  InitiateResult,
  PaymentProviderInterface,
} from './payment-provider.interface';

@Injectable()
export class MockProvider implements PaymentProviderInterface {
  readonly name = 'MOCK' as const;

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    // Mock: haqiqiy provider yo'q. Natija webhook orqali keladi (BR-PAY-1).
    void params;
    return { transactionId: `mock-tx-${randomUUID()}` };
  }
}