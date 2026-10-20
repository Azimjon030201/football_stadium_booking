import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';

// Sinf nomi PaymentModule — app.module.ts shuni import qiladi (o'zgartirmaymiz).
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockProvider],
  exports: [PaymentsService],
})
export class PaymentModule {}
