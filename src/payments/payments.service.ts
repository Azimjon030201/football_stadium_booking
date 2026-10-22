import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MockProvider } from './providers/mock-provider';
import { PaymentErrors } from './payments.errors';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MockProvider = new MockProvider(),
  ) {}

  async initiatePayment(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({ error: PaymentErrors.BOOKING_NOT_FOUND });
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException({ error: PaymentErrors.FORBIDDEN_RESOURCE });
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException({ error: PaymentErrors.BOOKING_INVALID_STATE });
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updateResult = await tx.booking.updateMany({
        where: { id: bookingId, userId, status: 'PENDING' },
        data: { status: 'PAYMENT_PENDING' },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException({ error: PaymentErrors.BOOKING_INVALID_STATE });
      }

      const amount = typeof booking.price === 'string' ? booking.price : booking.price.toString();

      const payment = await tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount,
          currency: 'UZS',
          provider: 'MOCK',
          status: 'INITIATED',
          idempotencyKey: `pay-${bookingId}-${Date.now()}`,
        },
        update: {
          amount,
          currency: 'UZS',
          provider: 'MOCK',
          status: 'INITIATED',
        },
      });

      const providerResult = await this.provider.initiate({
        paymentId: payment.id,
        bookingId,
        amount,
        currency: 'UZS',
        idempotencyKey: payment.idempotencyKey,
      });

      const paymentUpdateClient = tx?.payment?.update ? tx.payment : this.prisma.payment;
      await paymentUpdateClient.update({
        where: { id: payment.id },
        data: {
          transactionId: providerResult.transactionId,
          status: 'PENDING',
          provider: 'MOCK',
        },
      });

      return {
        status: 'PENDING',
        transactionId: providerResult.transactionId,
      };
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    // Payment'da userId yo'q — egalik Booking orqali (nested) tekshiriladi.
    // Owner uchun yana Booking -> Field -> Stadium.ownerId zanjiri kerak (SRS 4.2).
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            userId: true,
            field: { select: { stadium: { select: { ownerId: true } } } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
    }

    const isAdmin = role === UserRole.ADMIN;
    const isBookingOwner = payment.booking.userId === userId; // to'lovni qilgan User
    const isStadiumOwner = payment.booking.field.stadium.ownerId === userId; // o'z stadioni bo'yicha

    if (!isAdmin && !isBookingOwner && !isStadiumOwner) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      transactionId: payment.transactionId,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}