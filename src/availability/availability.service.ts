import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailability(fieldId: string, date: string) {
    // YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Sana YYYY-MM-DD formatida bo‘lishi kerak');
    }

    const selectedDate = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Noto‘g‘ri sana');
    }

    // 1. Field mavjudmi va faolmi?
    const field = await this.prisma.field.findFirst({
      where: {
        id: fieldId,
        isActive: true,
        deletedAt: null,
        stadium: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      include: {
        stadium: true,
      },
    });

    if (!field) {
      throw new NotFoundException(
        'Maydon topilmadi yoki hozirda faol emas',
      );
    }

    // JS: Sunday = 0, Monday = 1 ...
    const dayOfWeek = selectedDate.getUTCDay();

    // 2. Oddiy working hours
    const workingHour = await this.prisma.workingHour.findFirst({
      where: {
        fieldId,
        dayOfWeek,
      },
    });

    if (!workingHour || workingHour.isClosed) {
      return {
        fieldId,
        date,
        isClosed: true,
        slots: [],
      };
    }

    const [openHour, openMinute] = workingHour.openTime
      .split(':')
      .map(Number);

    const [closeHour, closeMinute] = workingHour.closeTime
      .split(':')
      .map(Number);

    const dayStart = new Date(`${date}T00:00:00.000Z`);

    const openAt = new Date(dayStart);
    openAt.setUTCHours(openHour, openMinute, 0, 0);

    const closeAt = new Date(dayStart);
    closeAt.setUTCHours(closeHour, closeMinute, 0, 0);

    // Default slot = 60 min
    const slotDuration = 60;
    const slotDurationMs = slotDuration * 60 * 1000;

    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // 3. Shu kundagi band bookinglar
    const bookings = await this.prisma.booking.findMany({
      where: {
        fieldId,
        status: {
          in: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'],
        },
        startTime: {
          lt: nextDay,
        },
        endTime: {
          gt: dayStart,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    // 4. Maintenance blocklar
    const maintenanceBlocks =
      await this.prisma.maintenanceBlock.findMany({
        where: {
          fieldId,
          startTime: {
            lt: nextDay,
          },
          endTime: {
            gt: dayStart,
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      });

    const now = new Date();

    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      reason?: string;
    }> = [];

    // 5. Slotlarni yasash
    for (
      let slotStart = new Date(openAt);
      slotStart.getTime() + slotDurationMs <= closeAt.getTime();
      slotStart = new Date(slotStart.getTime() + slotDurationMs)
    ) {
      const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

      // Bugungi kun bo‘lsa va slot o‘tib ketgan bo‘lsa
      if (slotStart <= now) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: false,
          reason: 'PAST',
        });

        continue;
      }

      // half-open interval overlap:
      // A_start < B_end && A_end > B_start
      const hasBooking = bookings.some(
        (booking) =>
          slotStart < booking.endTime &&
          slotEnd > booking.startTime,
      );

      if (hasBooking) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: false,
          reason: 'BOOKED',
        });

        continue;
      }

      const hasMaintenance = maintenanceBlocks.some(
        (block) =>
          slotStart < block.endTime &&
          slotEnd > block.startTime,
      );

      if (hasMaintenance) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: false,
          reason: 'MAINTENANCE',
        });

        continue;
      }

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        available: true,
      });
    }

    return {
      fieldId,
      date,
      isClosed: false,
      openTime: workingHour.openTime,
      closeTime: workingHour.closeTime,
      slotDuration,
      slots,
    };
  }
}