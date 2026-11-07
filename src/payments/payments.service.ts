import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MockProvider } from './providers/mock-provider';
import { PaymentWebhookDto } from './dto/webhook.dto';

const FINAL_PAYMENT = ['SUCCESS', 'FAILED', 'REFUNDED', 'EXPIRED'];

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mock: MockProvider,
  ) {}

  private getProvider(name: string) {
    if (name.toUpperCase() === 'MOCK') return this.mock;
    throw new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: `Unknown provider: ${name}`,
    });
  }

  // ───────────────────────── POST /payments/initiate ─────────────────────────
  // Birinchi urinish ham, FAILED'dan keyingi qayta urinish ham shu yerdan o'tadi
  // (FAILED'da Booking PENDING ga qaytadi, shuning uchun PENDING -> PAYMENT_PENDING qayta ishlaydi).
  async initiatePayment(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ error: 'BOOKING_NOT_FOUND' });
    if (booking.userId !== userId) throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    if (booking.status !== 'PENDING') {
      throw new BadRequestException({
        error: 'BOOKING_INVALID_STATE',
        message: `Booking is ${booking.status}.`,
      });
    }

    const idempotencyKey = `idem-${randomUUID()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      // Poyga himoyasi: faqat bitta parallel so'rov PENDING -> PAYMENT_PENDING ga o'ta oladi
      const { count } = await tx.booking.updateMany({
        where: { id: bookingId, userId, status: 'PENDING' },
        data: { status: 'PAYMENT_PENDING' },
      });
      if (count === 0) {
        throw new BadRequestException({ error: 'BOOKING_INVALID_STATE' });
      }

      // Payment.bookingId UNIQUE (1:1): qayta urinishda yangi qator yaratilmaydi,
      // FAILED qator yangi kalit bilan qayta ishga tushiriladi.
      return tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount: booking.price,
          currency: 'UZS',
          provider: 'MOCK',
          status: 'INITIATED',
          idempotencyKey,
        },
        update: {
          status: 'INITIATED',
          idempotencyKey,
          transactionId: null,
          amount: booking.price,
        },
      });
    });

    // Tashqi chaqiruv tranzaksiyadan tashqarida (lock vaqtini qisqa tutish)
    let result;
    try {
      result = await this.mock.initiate({
        paymentId: payment.id,
        bookingId,
        amount: payment.amount.toString(),
        currency: payment.currency,
        idempotencyKey,
      });
    } catch (e) {
      // Provider yiqilsa Booking "osilib" qolmasin
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'PENDING' } });
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw e;
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', transactionId: result.transactionId },
    });

    this.log.log({ event: 'PAYMENT_INITIATED', bookingId, paymentId: payment.id });
    // Mock rejimida idempotencyKey qaytariladi — Postman webhook'ga qo'yadi
    return {
      id: updated.id,
      bookingId,
      status: updated.status,
      amount: updated.amount.toString(),
      currency: updated.currency,
      transactionId: updated.transactionId,
      idempotencyKey,
      redirectUrl: result.redirectUrl,
    };
  }

  // ───────────────────── POST /payments/webhook/:provider ─────────────────────
  async handleWebhook(providerName: string, dto: PaymentWebhookDto) {
    this.getProvider(providerName);

    const payment = await this.prisma.payment.findFirst({
      where: { OR: [{ bookingId: dto.bookingId }, { idempotencyKey: dto.idempotencyKey }] },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });

    // BR-PAY-2: final holatdagi to'lov qayta ishlanmaydi
    if (FINAL_PAYMENT.includes(payment.status)) return { received: true };

    // Qayta urinishdan keyin kelgan ESKI urinish webhooki yangisini buzmasin
    if (payment.idempotencyKey && payment.idempotencyKey !== dto.idempotencyKey) {
      this.log.warn({ event: 'STALE_WEBHOOK_IGNORED', bookingId: payment.bookingId });
      return { received: true };
    }

    if (new Prisma.Decimal(dto.amount).comparedTo(payment.amount) !== 0) {
      throw new BadRequestException({ error: 'PAYMENT_AMOUNT_MISMATCH' });
    }

    const userId = payment.booking.userId;

    await this.prisma.$transaction(async (tx) => {
      // Poyga: tranzaksiya ichida joriy holatni qayta o'qiymiz
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (FINAL_PAYMENT.includes(current.status)) return;

      const success = dto.status === 'SUCCESS';
      const paymentStatus = success ? 'SUCCESS' : 'FAILED';
      // FAILED => Booking PENDING (qayta urinish mumkin). Muddati o'tsa CRON EXPIRED qiladi.
      const bookingStatus = success ? 'CONFIRMED' : 'PENDING';

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: paymentStatus, transactionId: dto.transactionId },
      });
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: bookingStatus },
      });
      await tx.notification.create({
        data: {
          userId,
          type: success ? 'BOOKING_CONFIRMED' : 'PAYMENT_FAILED',
          title: success ? 'Bron tasdiqlandi' : "To'lov amalga oshmadi",
          body: success
            ? "To'lov qabul qilindi, broningiz tasdiqlandi."
            : "To'lov muvaffaqiyatsiz tugadi. Muddat tugamaguncha qayta urinib ko'ring.",
          metadata: { bookingId: payment.bookingId, paymentId: payment.id },
        },
      });
    });

    if (dto.status === 'FAILED') {
      this.log.warn({ event: 'PAYMENT_FAILED', bookingId: payment.bookingId, reason: dto.failureReason });
    }
    return { received: true };
  }

  // ─────────────────────────── GET /payments/:id ───────────────────────────
  async findOne(id: string, userId: string, role: UserRole) {
    const p = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { field: { include: { stadium: true } } } } },
    });
    if (!p) throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });

    const allowed =
      role === UserRole.ADMIN ||
      p.booking.userId === userId ||
      (role === UserRole.OWNER && p.booking.field.stadium.ownerId === userId);
    if (!allowed) throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });

    // idempotencyKey va booking qaytarilmaydi
    return {
      id: p.id,
      bookingId: p.bookingId,
      amount: p.amount.toString(),
      currency: p.currency,
      provider: p.provider,
      transactionId: p.transactionId,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}