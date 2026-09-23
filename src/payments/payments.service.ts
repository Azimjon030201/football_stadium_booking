import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MockProvider } from './providers/mock-provider';
import { WebhookDto } from './dto/webhook.dto';

// Batafsil: Dev5 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.
@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private mockProvider: MockProvider,
  ) {}

  // TASK-04, TASK-05, TASK-06: POST /payments/initiate
  // - booking mavjudligi, egaligi, status==='PENDING' tekshiriladi
  // - idempotencyKey shu yerda generatsiya qilinadi
  async initiate(bookingId: string, userId: string) {
    throw new Error('TODO (Dev5 TASK-04): initiate() implement qilinmagan');
  }

  // TASK-07, TASK-08, TASK-09 (Hafta 3, ENG MUHIM): POST /payments/webhook/mock
  // - TASK-08: idempotencyKey bo'yicha "allaqachon final holatda" tekshiruvi
  // - TASK-09: Payment+Booking BIR $transaction() ichida yangilanadi
  async handleWebhook(dto: WebhookDto) {
    throw new Error('TODO (Dev5 TASK-08/09): handleWebhook() implement qilinmagan');
  }

  // TASK-10: GET /payments/:id — payment.booking.userId orqali (nested) egalik
  async findOne(id: string, userId: string, role: string) {
    throw new Error('TODO (Dev5 TASK-10): findOne() implement qilinmagan');
  }
}
