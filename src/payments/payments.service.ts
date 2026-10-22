import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ... initiate(), handleWebhook() boshqa vazifalarda

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

    // idempotencyKey va ichki booking obyektini oshkor qilmaymiz
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