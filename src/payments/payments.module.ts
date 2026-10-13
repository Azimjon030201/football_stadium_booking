import { Module } from '@nestjs/common';
import { MockProvider } from './providers/mock-provider';
import { PAYMENT_PROVIDER } from './payment.constants';
import { PaymentController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';

@Module({
  controllers: [PaymentController],
  providers: [
    MockProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: MockProvider,
    },
    PaymentsService,
    WebhookSignatureGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentModule {}