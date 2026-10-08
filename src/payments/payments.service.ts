import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
// MOSLANG: import yo'llari
import { ErrorCodes } from '../common/constants/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { MockProvider } from './providers/mock-provider';

type PaymentRow = {
  id: string;
  bookingId: string;
  amount: Prisma.Decimal | number;
  status: string;
  transactionId: string | null;
  idempotencyKey: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockProvider,
  ) {}

  async initiate(bookingId: string, userId: string) {
    // TASK-04: bron mavjudmi, o'zinikimi
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException({ error: ErrorCodes.BOOKING_NOT_FOUND });
    if (booking.userId !== userId) {
      throw new ForbiddenException({ error: ErrorCodes.FORBIDDEN_RESOURCE });
    }

    // TASK-05: to'lov allaqachon bormi?
    const existing = booking.payment;
    if (existing) {
      // idempotent: faol to'lov bo'lsa o'shani qaytaramiz
      if (['INITIATED', 'PENDING'].includes(existing.status)) {
        return this.toResponse(existing);
      }
      // SRS 15.3: FAILED bo'lsa qayta urinish mumkin (bookingId unique, shu sababli
      // yangi qator emas, mavjud qator yangilanadi). Qolgan holatlar — rad.
      if (existing.status !== 'FAILED') {
        throw new ConflictException({ error: ErrorCodes.PAYMENT_ALREADY_PROCESSED });
      }
    }

    // SRS 11.2: to'lov faqat PENDING bron uchun boshlanadi
    if (booking.status !== 'PENDING') {
      throw new ConflictException({ error: ErrorCodes.BOOKING_INVALID_STATE });
    }

    // TASK-06: summa FAQAT bazadagi bron narxidan
    const amount = Number(booking.price);
    const result = await this.mockProvider.initiate(amount, booking.id);

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        let saved: PaymentRow;
        if (existing) {
          // qayta urinish: faqat hali FAILED bo'lsa yangilaymiz (parallel so'rovdan himoya)
          const upd = await tx.payment.updateMany({
            where: { id: existing.id, status: 'FAILED' },
            data: {
              transactionId: result.transactionId,
              status: 'PENDING',
              idempotencyKey: randomUUID(),
            },
          });
          if (upd.count === 0) {
            throw new ConflictException({ error: ErrorCodes.PAYMENT_ALREADY_PROCESSED });
          }
          saved = await tx.payment.findUniqueOrThrow({ where: { id: existing.id } });
        } else {
          saved = await tx.payment.create({
            data: {
              bookingId: booking.id,
              amount,
              provider: 'MOCK',
              transactionId: result.transactionId,
              status: 'PENDING',
              idempotencyKey: randomUUID(),
            },
          });
        }

        // SRS 11.2: PENDING -> PAYMENT_PENDING (payment bilan bir tranzaksiyada)
        const b = await tx.booking.updateMany({
          where: { id: booking.id, status: 'PENDING' },
          data: { status: 'PAYMENT_PENDING' },
        });
        if (b.count === 0) {
          throw new ConflictException({ error: ErrorCodes.BOOKING_INVALID_STATE });
        }
        return saved;
      });
      return this.toResponse(payment);
    } catch (e) {
      // parallel so'rovda yutqazgan tomon: g'olib yaratgan to'lovni qaytaramiz
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const winner = await this.prisma.payment.findUnique({ where: { bookingId: booking.id } });
        if (winner) return this.toResponse(winner);
        throw new ConflictException({ error: ErrorCodes.PAYMENT_ALREADY_PROCESSED });
      }
      throw e;
    }
  }

  private toResponse(p: PaymentRow) {
    return {
      paymentId: p.id,
      bookingId: p.bookingId,
      amount: Number(p.amount),
      status: p.status,
      transactionId: p.transactionId,
      idempotencyKey: p.idempotencyKey,
    };
  }
}