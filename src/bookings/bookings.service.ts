import {
<<<<<<< HEAD
=======
  BadRequestException,
>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
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
<<<<<<< HEAD
      throw new ConflictException({
=======
      throw new BadRequestException({
>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Noto‘g‘ri sana format',
      });
    }

    if (start >= end) {
<<<<<<< HEAD
      throw new ConflictException({
=======
      throw new BadRequestException({
>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
        error: ErrorCodes.BOOKING_INVALID_DURATION,
        message: 'Booking tugash vaqti boshlanish vaqtidan katta bo‘lishi kerak',
      });
    }

    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    if (durationMinutes < 60 || durationMinutes > 180) {
<<<<<<< HEAD
      throw new ConflictException({
=======
      throw new BadRequestException({
>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
        error: ErrorCodes.BOOKING_INVALID_DURATION,
        message: 'Bron 60 dan 180 daqiqagacha bo‘lishi kerak',
      });
    }

    if (start < new Date()) {
<<<<<<< HEAD
      throw new ConflictException({
=======
      throw new BadRequestException({
>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
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

<<<<<<< HEAD
=======
      const TZ_MS = 5 * 60 * 60 * 1000;
      const localStart = new Date(start.getTime() + TZ_MS);
      const localEnd = new Date(end.getTime() + TZ_MS);
      const dateStr = localStart.toISOString().slice(0, 10);

      if (localEnd.toISOString().slice(0, 10) !== dateStr) {
        throw new BadRequestException({
          error: ErrorCodes.BOOKING_OUTSIDE_WORKING_HOURS,
          message: 'Bron bir kun ichida bo‘lishi kerak',
        });
      }

      const dayOfWeek = localStart.getUTCDay();
      const special = await tx.specialWorkingDay.findFirst({
        where: { fieldId: dto.fieldId, date: new Date(dateStr) },
      });
      const regular = await tx.workingHour.findUnique({
        where: { fieldId_dayOfWeek: { fieldId: dto.fieldId, dayOfWeek } },
      });
      const schedule = special ?? regular;

      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const startMin = localStart.getUTCHours() * 60 + localStart.getUTCMinutes();
      const endMin = localEnd.getUTCHours() * 60 + localEnd.getUTCMinutes();

      if (
        !schedule ||
        schedule.isClosed ||
        !schedule.openTime ||
        !schedule.closeTime ||
        startMin < toMin(schedule.openTime) ||
        endMin > toMin(schedule.closeTime)
      ) {
        throw new BadRequestException({
          error: ErrorCodes.BOOKING_OUTSIDE_WORKING_HOURS,
          message: 'Tanlangan vaqt maydonning ish vaqtidan tashqarida',
        });
      }

>>>>>>> 49cabb4e3c18d4c67bdcec7b4727325776faebb8
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
