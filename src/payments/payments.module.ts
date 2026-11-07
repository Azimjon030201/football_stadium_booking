import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';
import { WebhookSignatureGuard } from './webhook-signature.guard';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockProvider, WebhookSignatureGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}