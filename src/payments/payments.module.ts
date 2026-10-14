import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}