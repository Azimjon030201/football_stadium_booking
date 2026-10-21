import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDto } from './dto/webhook.dto';
import { MockProvider } from './providers/mock-provider';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MockProvider,
  ) {}

  async initiatePayment(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        error: 'BOOKING_NOT_FOUND',
        message: 'Bron topilmadi',
      });
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN_RESOURCE',
        message: 'Bu bron sizga tegishli emas',
      });
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException({
        error: 'BOOKING_INVALID_STATE',
        message: 'Bron to‘lovni boshlash holatida emas',
      });
    }

    // Narx foydalanuvchidan emas, bazadagi brondan olinadi.
    const amount = booking.price.toString();

    const payment = await this.prisma.$transaction(async (tx) => {
      // Parallel so‘rovlardan faqat bittasi holatni o‘zgartira oladi.
      const updated = await tx.booking.updateMany({
        where: {
          id: bookingId,
          userId,
          status: 'PENDING',
        },
        data: {
          status: 'PAYMENT_PENDING',
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException({
          error: 'BOOKING_INVALID_STATE',
          message: 'Bron holati o‘zgargan yoki to‘lov boshlangan',
        });
      }

      return tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount,
          currency: 'UZS',
          provider: this.provider.name,
          status: 'INITIATED',
          idempotencyKey: randomUUID(),
        },
        update: {},
      });
    });

    const result = await this.provider.initiate({
      paymentId: payment.id,
      bookingId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      idempotencyKey: payment.idempotencyKey,
    });

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: result.transactionId,
        status: 'PENDING',
      },
    });

    return {
      ...updatedPayment,
      ...(result.redirectUrl
        ? { redirectUrl: result.redirectUrl }
        : {}),
    };
  }

  /**
   * POST /payments/webhook/:provider
   * HMAC imzo tekshiruvi controller/guard darajasida bajariladi (BR-PAY-1).
   */
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
       timeout: 10000 
      };
    