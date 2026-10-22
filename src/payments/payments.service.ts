import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MockProvider } from './providers/mock-provider';

@Injectable()
export class PaymentsService {
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

    const payment = await this.prisma.$transaction(async (tx) => {
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
          amount: booking.price.toString(),
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
      bookingId: payment.bookingId,
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
      id: updatedPayment.id,
      bookingId: updatedPayment.bookingId,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      provider: updatedPayment.provider,
      transactionId: updatedPayment.transactionId,
      status: updatedPayment.status,
      createdAt: updatedPayment.createdAt,
      updatedAt: updatedPayment.updatedAt,
      ...(result.redirectUrl
        ? { redirectUrl: result.redirectUrl }
        : {}),
    };
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            userId: true,
            field: {
              select: {
                stadium: {
                  select: {
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({
        error: 'PAYMENT_NOT_FOUND',
        message: 'To‘lov topilmadi',
      });
    }

    const isAdmin = role === UserRole.ADMIN;
    const isBookingOwner = payment.booking.userId === userId;
    const isStadiumOwner =
      role === UserRole.OWNER &&
      payment.booking.field.stadium.ownerId === userId;

    if (!isAdmin && !isBookingOwner && !isStadiumOwner) {
      throw new ForbiddenException({
        error: 'FORBIDDEN_RESOURCE',
        message: 'Bu to‘lovni ko‘rishga ruxsat yo‘q',
      });
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