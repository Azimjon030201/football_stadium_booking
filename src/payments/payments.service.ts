import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class WebhookDto {
  @IsString()
  transactionId: string;

  @IsString()
  bookingId: string;

  @IsIn(['SUCCESS', 'FAILED'])
  status: 'SUCCESS' | 'FAILED';

  @IsNumber()
  amount: number;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /payments/webhook/:provider
   * HMAC imzo tekshiruvi controller/guard darajasida bajariladi (BR-PAY-1).
   */
  async handleWebhook(dto: WebhookDto) {
    // 1. Payment'ni idempotencyKey bo'yicha topish (BR-PAY-2)
    const payment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (!payment) {
      throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
    }

    // 2. Allaqachon yakuniy holatda bo'lsa — qayta ishlanmaydi, 200 OK
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      return { received: true, alreadyProcessed: true };
    }

    // 3. Xavfsizlik: webhook'dagi bookingId va summa bazadagi bilan mos bo'lishi kerak
    if (
      payment.bookingId !== dto.bookingId ||
      Number(payment.amount) !== dto.amount
    ) {
      this.logger.warn('Webhook mismatch: payment='+payment.id);
      throw new ConflictException({ error: 'PAYMENT_MISMATCH' });
    }

    return dto.status === 'SUCCESS'
      ? this.handleSuccess(payment.id, payment.bookingId, dto)
      : this.handleFailed(payment.id, payment.bookingId);
  }

  private async handleSuccess(
    paymentId: string,
    bookingId: string,
    dto: WebhookDto,
  ) {
    // Interactive transaction: ikkala update ATOMIK (hammasi yoki hech narsa).
    // Biror qadam xato bersa — butun transaction rollback bo'ladi.
    return this.prisma.$transaction(
      async (tx) => {
        // (1) Payment -> SUCCESS. Shart: hali final emas.
        // Parallel kelgan ikkinchi webhook bu yerda count=0 oladi.
        const paid = await tx.payment.updateMany({
          where: { id: paymentId, status: { in: ['INITIATED', 'PENDING'] } },
          data: { status: 'SUCCESS', transactionId: dto.transactionId },
        });
        if (paid.count === 0) {
          return { received: true, alreadyProcessed: true };
        }

        // (2) Booking -> CONFIRMED. Faqat to'lov kutilayotgan bron uchun.
        const confirmed = await tx.booking.updateMany({
          where: {
            id: bookingId,
            status: { in: ['PENDING', 'PAYMENT_PENDING'] },
          },
          data: { status: 'CONFIRMED' },
        });
        if (confirmed.count === 0) {
          // Masalan, CRON bronni EXPIRED qilib qo'ygan. Rollback -> Payment ham o'zgarmaydi.
          // Bu holat monitoring/qo'lda refund uchun log qilinadi.
          this.logger.error(
            'paid but booking not confirmed: booking='+bookingId,
          );
          throw new ConflictException({ error: 'BOOKING_NOT_CONFIRMABLE' });
        }

        // (3) Notification'lar (SRS 18-bo'lim) — shu transaction ichida
        const booking = await tx.booking.findUniqueOrThrow({
          where: { id: bookingId },
          select: { userId: true },
        });
        await tx.notification.createMany({
          data: [
            {
              userId: booking.userId,
              type: 'PAYMENT_SUCCESSFUL',
              title: "To'lov muvaffaqiyatli",
              body: "To'lovingiz qabul qilindi.",
              metadata: { bookingId } as Prisma.InputJsonValue,
            },
            {
              userId: booking.userId,
              type: 'BOOKING_CONFIRMED',
              title: 'Bron tasdiqlandi',
              body: 'Broningiz tasdiqlandi.',
              metadata: { bookingId } as Prisma.InputJsonValue,
            },
          ],
        });

        return { received: true };
      },
      { timeout: 10000 }, // SRS 33-bo'lim
    );
  }

  private async handleFailed(paymentId: string, bookingId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const failed = await tx.payment.updateMany({
          where: { id: paymentId, status: { in: ['INITIATED', 'PENDING'] } },
          data: { status: 'FAILED' },
        });
        if (failed.count === 0) {
          return { received: true, alreadyProcessed: true };
        }

        // Qayta urinish uchun PENDING'ga qaytariladi.
        // Muddat tugasa, CRON (expire-unpaid-bookings) EXPIRED qiladi.
        await tx.booking.updateMany({
          where: { id: bookingId, status: 'PAYMENT_PENDING' },
          data: { status: 'PENDING' },
        });

        return { received: true };
      },
      { timeout: 10000 },
    );
  }
}