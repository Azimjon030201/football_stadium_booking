import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ConflictException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Noto‘g‘ri sana format',
      });
    }

    if (start >= end) {
      throw new ConflictException({
        error: ErrorCodes.BOOKING_INVALID_DURATION,
        message: 'Booking tugash vaqti boshlanish vaqtidan katta bo‘lishi kerak',
      });
    }

    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    if (durationMinutes < 60 || durationMinutes > 180) {
      throw new ConflictException({
        error: ErrorCodes.BOOKING_INVALID_DURATION,
        message: 'Bron 60 dan 180 daqiqagacha bo‘lishi kerak',
      });
    }

    if (start < new Date()) {
      throw new ConflictException({
        error: ErrorCodes.BOOKING_PAST_TIME,
        message: 'Kelajakdagi vaqtni tanlang',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Field" WHERE id = ${dto.fieldId} FOR UPDATE`;

      const field = await tx.field.findUnique({
        where: { id: dto.fieldId },
        include: { stadium: true },
      });

      if (!field) {
        throw new NotFoundException({
          error: ErrorCodes.FIELD_NOT_FOUND,
          message: 'Field topilmadi',
        });
      }

      if (!field.isActive) {
        throw new ConflictException({
          error: ErrorCodes.FIELD_INACTIVE,
          message: 'Field faol emas',
        });
      }

      if (field.stadium.status !== 'ACTIVE') {
        throw new ConflictException({
          error: ErrorCodes.STADIUM_INVALID_STATE,
          message: 'Stadium faol holatda emas',
        });
      }

      const overlap = await tx.booking.findFirst({
        where: {
          fieldId: dto.fieldId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED],
          },
          AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
        },
      });

      if (overlap) {
        throw new ConflictException({
          error: ErrorCodes.BOOKING_CONFLICT,
          message: 'Ushbu vaqt oralig‘i band qilingan',
        });
      }

      const hourlyPrice = new Prisma.Decimal(field.pricePerHour.toString());
      const price = hourlyPrice.mul(durationMinutes / 60);

      return tx.booking.create({
        data: {
          userId,
          fieldId: dto.fieldId,
          startTime: start,
          endTime: end,
          duration: Math.round(durationMinutes),
          price,
          status: BookingStatus.PENDING,
        },
      });
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { field: { include: { stadium: true } } },
    });

    if (!booking) {
      throw new NotFoundException({
        error: ErrorCodes.BOOKING_NOT_FOUND,
        message: 'Booking topilmadi',
      });
    }

    const canView =
      booking.userId === userId ||
      role === 'ADMIN' ||
      booking.field.stadium.ownerId === userId;

    if (!canView) {
      throw new ForbiddenException({
        error: ErrorCodes.FORBIDDEN_RESOURCE,
        message: 'Bu bookingni ko‘rishga ruxsat yo‘q',
      });
    }

    return booking;
  }

  async cancel(id: string, userId: string, role: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { field: { include: { stadium: true } } },
    });

    if (!booking) {
      throw new NotFoundException({
        error: ErrorCodes.BOOKING_NOT_FOUND,
        message: 'Booking topilmadi',
      });
    }

    const canCancel =
      booking.userId === userId ||
      role === 'ADMIN' ||
      booking.field.stadium.ownerId === userId;

    if (!canCancel) {
      throw new ForbiddenException({
        error: ErrorCodes.FORBIDDEN_RESOURCE,
        message: 'Bekor qilishga ruxsat yo‘q',
      });
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException({
        error: ErrorCodes.BOOKING_INVALID_STATE,
        message: 'Booking allaqachon bekor qilingan',
      });
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason ?? 'Cancelled by user',
      },
    });
  }
}
