import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

const FINAL_PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'REFUNDED', 'EXPIRED'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get expirationMs() {
    return Number(this.config.get('PAYMENT_EXPIRATION_MINUTES', 15)) * 60_000;
  }

  // ---------------------------------------------------------------
  // POST /payments/initiate  (birinchi urinish ham, FAILED'dan keyingi retry ham)
  // ---------------------------------------------------------------
  async initiate(bookingId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { payment: true },
        });
        if (!booking) throw new NotFoundException({ error: 'BOOKING_NOT_FOUND' });
        if (booking.userId !== userId) {
          throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
        }

        // Muddat o'tgan bo'lsa retry ham mumkin emas (CRON ham xuddi shuni qiladi)
        if (Date.now() - booking.createdAt.getTime() > this.expirationMs) {
          await tx.booking.updateMany({
            where: { id: bookingId, status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
            data: { status: 'EXPIRED' },
          });
          throw new ConflictException({
            error: 'BOOKING_EXPIRED',
            message: 'Booking payment window has expired. Please create a new booking.',
          });
        }

        if (booking.status !== 'PENDING') {
          // CONFIRMED / PAYMENT_PENDING / CANCELLED / EXPIRED ...
          throw new ConflictException({
            error:
              booking.status === 'CONFIRMED'
                ? 'PAYMENT_ALREADY_PROCESSED'
                : 'BOOKING_NOT_PAYABLE',
            message: `Booking status is ${booking.status}`,
          });
        }

        const transactionId = `mock-tx-${randomUUID()}`;
        const idempotencyKey = `idem-${randomUUID()}`;
        let payment = booking.payment;

        if (!payment) {
          payment = await tx.payment.create({
            data: {
              bookingId,
              amount: booking.price,
              provider: 'MOCK',
              status: 'INITIATED',
              transactionId,
              idempotencyKey,
            },
          });
        } else if (payment.status === 'FAILED') {
          // RETRY: bir xil Payment qatorini yangi kalitlar bilan qayta ochamiz.
          // Eski idempotencyKey'li kechikkan webhook'lar endi hech narsani o'zgartirmaydi.
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'INITIATED', transactionId, idempotencyKey },
          });
        } else {
          throw new ConflictException({
            error: 'PAYMENT_IN_PROGRESS',
            message: `Payment is already ${payment.status}`,
          });
        }

        // Atomik guard: faqat PENDING bo'lsa PAYMENT_PENDING ga o'tadi
        const moved = await tx.booking.updateMany({
          where: { id: bookingId, status: 'PENDING' },
          data: { status: 'PAYMENT_PENDING' },
        });
        if (moved.count === 0) {
          throw new ConflictException({ error: 'BOOKING_NOT_PAYABLE' });
        }

        return {
          paymentId: payment.id,
          bookingId,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          transactionId: payment.transactionId,
          idempotencyKey: payment.idempotencyKey, // mock uchun: Postman'da webhook'ga qo'yiladi
          status: payment.status,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000 },
    );
  }

  // ---------------------------------------------------------------
  // POST /payments/webhook/:provider  (SUCCESS va FAILED)
  // ---------------------------------------------------------------
  async handleWebhook(dto: PaymentWebhookDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { transactionId: dto.transactionId },
          include: { booking: true },
        });

        if (!payment || payment.idempotencyKey !== dto.idempotencyKey) {
          // Noma'lum yoki eskirgan kalit (masalan retry'dan oldingi kechikkan webhook)
          // Provider qayta-qayta yubormasligi uchun 200 qaytaramiz, lekin hech narsa o'zgarmaydi.
          this.logger.warn(`Webhook ignored: unknown/stale tx=${dto.transactionId}`);
          return { received: true };
        }

        if (payment.bookingId !== dto.bookingId) {
          throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
        }

        // BR-PAY-2: idempotency. Atomik guard: faqat final bo'lmagan holatdan o'tkazamiz.
        const newStatus = dto.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
        const claimed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { notIn: FINAL_PAYMENT_STATUSES as any },
          },
          data: { status: newStatus },
        });
        if (claimed.count === 0) {
          this.logger.log(`Duplicate webhook ignored: ${dto.idempotencyKey}`);
          return { received: true };
        }

        const expired =
          Date.now() - payment.booking.createdAt.getTime() > this.expirationMs;

        if (newStatus === 'SUCCESS') {
          await tx.booking.updateMany({
            where: { id: payment.bookingId, status: 'PAYMENT_PENDING' },
            data: { status: 'CONFIRMED' },
          });
          // + notification PAYMENT_SUCCESSFUL, BOOKING_CONFIRMED (user, owner)
        } else {
          // FAILED yo'li: Booking "osilib" qolmasligi kerak
          await tx.booking.updateMany({
            where: { id: payment.bookingId, status: 'PAYMENT_PENDING' },
            data: { status: expired ? 'EXPIRED' : 'PENDING' },
          });
          await tx.notification.create({
            data: {
              userId: payment.booking.userId,
              type: 'PAYMENT_FAILED', // enum'ga qo'shing (pastdagi izohga qarang)
              title: 'To‘lov amalga oshmadi',
              body: expired
                ? 'To‘lov muddati tugadi, bron bekor qilindi.'
                : 'To‘lov muvaffaqiyatsiz tugadi. Qayta urinib ko‘rishingiz mumkin.',
              metadata: { bookingId: payment.bookingId, paymentId: payment.id },
            },
          });
        }

        this.logger.log(
          JSON.stringify({
            event: newStatus === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
            bookingId: payment.bookingId,
            paymentId: payment.id,
          }),
        );
        return { received: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000 },
    );
  }
}