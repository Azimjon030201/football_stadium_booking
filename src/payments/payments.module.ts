import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule], // PrismaModule @Global bo'lsa, shart emas
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}