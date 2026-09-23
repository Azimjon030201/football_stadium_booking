import { Injectable } from '@nestjs/common';
import { PaymentProviderInterface } from './payment-provider.interface';

// TASK-03 (Dev5, Hafta 1): MockProvider — soxta to'lov provayderi.
// To'lovni darhol "muvaffaqiyatli" deb simulyatsiya qilishi kerak.
// Namuna: transactionId generatsiya qiling (masalan uuid orqali),
// { transactionId, status: 'SUCCESS' } qaytaring.
@Injectable()
export class MockProvider implements PaymentProviderInterface {
  async initiate(
    amount: number,
    bookingId: string,
  ): Promise<{ transactionId: string; status: string }> {
    throw new Error('TODO (Dev5 TASK-03): MockProvider.initiate() implement qilinmagan');
  }
}
