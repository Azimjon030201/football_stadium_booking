
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { MockProvider } from './providers/mock-provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockProvider,
  ) { }

  async initiatePayment(bookingId: string, userId: string) {
    // 1) Mavjudlik
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND,
        'Booking not found',
      );
    }

    // 2) Egalik
    if (booking.userId !== userId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
        'You do not have access to this booking',
      );
    }

    // 3) Holat: faqat PENDING (tezkor xato xabari uchun)
    if (booking.status !== 'PENDING') {
      throw this.invalidState(booking.status);
    }

    // 4) Idempotency key backend tomonidan generatsiya qilinadi
    const idempotencyKey = randomUUID();

    // 5) Atomik: PENDING -> PAYMENT_PENDING + Payment(INITIATED)
    const payment = await this.prisma.$transaction(
      async (tx) => {
        // Ikki parallel so'rov bo'lsa, faqat bittasi count=1 oladi
        const updated = await tx.booking.updateMany({
          where: { id: bookingId, userId, status: 'PENDING' },
          data: { status: 'PAYMENT_PENDING' },
        });

        if (updated.count === 0) {
          throw this.invalidState('NOT_PENDING');
        }

        // Payment.bookingId unique (1:1): qayta urinishda mavjudini yangilaymiz
        return tx.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            amount: booking.price,
            currency: 'UZS',
            provider: this.mockProvider.name,
            status: 'INITIATED',
            idempotencyKey,
          },
          update: {
            amount: booking.price,
            status: 'INITIATED',
            idempotencyKey,
            transactionId: null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );

    // 6) Provider chaqiruvi transaction TASHQARISIDA (49-bo'lim tavsiyasi)
    const result = await this.mockProvider.initiate({
      paymentId: payment.id,
      bookingId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      idempotencyKey,
    });

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: result.transactionId, status: 'PENDING' },
    });

    return {
      paymentId: updatedPayment.id,
      bookingId,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      status: updatedPayment.status,
      idempotencyKey,
      transactionId: result.transactionId,
      redirectUrl: result.redirectUrl ?? null,
    };
  }

  private invalidState(current: string) {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.BOOKING_INVALID_STATE,
      `Booking status must be PENDING, current: ${current}`,
    );
  }
}