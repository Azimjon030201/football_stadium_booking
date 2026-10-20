import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleWebhook(dto: WebhookDto) {
    this.logger.log(`Webhook received: ${JSON.stringify(dto)}`);

    // 1. ENG BOSHIDA: idempotencyKey bo'yicha Payment'ni topamiz
    const payment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (!payment) {
      throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    }

    // 2. IDEMPOTENCY TEKSHIRUVI: Payment mavjudligi emas, uning STATUSI muhim.
    //    Final holatda bo'lsa, hech narsa o'zgartirmaymiz va xato ham qaytarmaymiz.
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      this.logger.warn(`Duplicate webhook ignored: key=${dto.idempotencyKey}, status=${payment.status}`);
      return { received: true, alreadyProcessed: true };
    }

    // 3. Faqat shu yerdan keyin haqiqiy yangilash boshlanadi
    // TODO (9-vazifa): Payment.status va Booking.status ni transaction ichida yangilash

    return { received: true };
  }
}