import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockProvider, JwtAuthGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
