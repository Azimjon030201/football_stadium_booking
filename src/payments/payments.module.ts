import { Module } from '@nestjs/common';
import { MockProvider } from './providers/mock-provider';
import { PAYMENT_PROVIDER } from './payment.constants';
import { PaymentController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';

@Module({
  controllers: [PaymentController],
  providers: [
    { provide: PAYMENT_PROVIDER, useClass: MockProvider }, // keyin: ClickProvider
    PaymentsService,
    WebhookSignatureGuard,
  ],
  exports: [PaymentsService], // BookingModule bekor qilishda refundForBooking() ishlatadi
})
export class PaymentModule {}