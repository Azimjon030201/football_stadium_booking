import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentErrors } from './payments.errors';
import { MockProvider } from './providers/mock-provider';
import { WebhookDto } from './dto/webhook.dto';

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
      throw new NotFoundException({
        error: PaymentErrors.BOOKING_NOT_FOUND,
        message: 'Bron topilmadi',
      });
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException({
        error: PaymentErrors.FORBIDDEN_RESOURCE,
        message: 'Bu bron sizga tegishli emas',
      });
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException({
        error: PaymentErrors.BOOKING_INVALID_STATE,
        message: 'Bron to‘lovni boshlash holatida emas',
      });
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updateResult = await tx.booking.updateMany({
        where: { id: bookingId, userId, status: 'PENDING' },
        data: { status: 'PAYMENT_PENDING' },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException({
          error: PaymentErrors.BOOKING_INVALID_STATE,
          message: 'Bron holati o‘zgargan yoki to‘lov boshlangan',
        });
      }

      const amount =
        typeof booking.price === 'string'
          ? booking.price
          : booking.price.toString();

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

      const paymentUpdateClient = tx?.payment?.update
        ? tx.payment
        : this.prisma.payment;

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
        error: PaymentErrors.PAYMENT_NOT_FOUND,
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
        error: PaymentErrors.FORBIDDEN_RESOURCE,
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

  async handleWebhook(provider: string, dto: WebhookDto) {
    const normalizedProvider = provider.toUpperCase();

    if (normalizedProvider !== 'MOCK') {
      throw new BadRequestException({
        error: PaymentErrors.UNKNOWN_PROVIDER,
        message: 'Unsupported provider',
      });
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ bookingId: dto.bookingId }, { idempotencyKey: dto.idempotencyKey }],
      },
      include: { booking: { select: { userId: true } } },
    });

    if (!payment) {
      throw new NotFoundException({
        error: PaymentErrors.PAYMENT_NOT_FOUND,
        message: 'Webhook uchun to‘lov topilmadi',
      });
    }

   
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      return { received: true };   // takroriy webhook — hech narsa qilmaymiz
    }
    if (Number(dto.amount) !== Number(payment.amount)) {
      throw new BadRequestException({
        error: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'Webhook summasi to\'lov summasiga mos kelmadi',
      });
    }
    
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    
      // Poyga holati: boshqa webhook allaqachon ishlab bo'lgan
      if (current.status === 'SUCCESS' || current.status === 'FAILED') {
        return;
      }
    
      if (dto.status === 'SUCCESS') {
        await tx.payment.update({
          where: { id: current.id },
          data: { status: 'SUCCESS', transactionId: dto.transactionId },
        });
        await tx.booking.update({
          where: { id: current.bookingId },
          data: { status: 'CONFIRMED' },
        });
        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            type: 'BOOKING_CONFIRMED',
            title: 'Booking confirmed',
            body: 'Your booking has been confirmed and paid successfully.',
            metadata: { bookingId: payment.bookingId, paymentId: payment.id },
          },
        });
      } else {
        await tx.payment.update({
          where: { id: current.id },
          data: { status: 'FAILED', transactionId: dto.transactionId },
        });
        await tx.booking.update({
          where: { id: current.bookingId },
          data: { status: 'PENDING' },
        });
        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            type: 'PAYMENT_FAILED',
            title: 'Payment failed',
            body: 'Your payment failed. You can try again.',
            metadata: { bookingId: payment.bookingId, paymentId: payment.id },
          },
        });
      }
    });
    
    return { received: true };
  }
}