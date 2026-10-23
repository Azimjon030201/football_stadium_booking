import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailability(fieldId: string, date: string) {
    const field = await this.prisma.field.findFirst({
      where: { id: fieldId, deletedAt: null },
      include: {
        stadium: true,
        workingHours: true,
      },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (!field.isActive || field.stadium.status !== 'ACTIVE') {
      throw new ConflictException({ error: 'FIELD_UNAVAILABLE' });
    }

    const targetDate = new Date(date);
    if (Number.isNaN(targetDate.getTime())) {
      throw new ConflictException({ error: 'VALIDATION_ERROR' });
    }

    const day = targetDate.getDay();
    const baseSchedule = field.workingHours.find((wh) => wh.dayOfWeek === day);
    const specialDay = await this.prisma.specialWorkingDay.findFirst({
      where: {
        fieldId,
        date: new Date(date),
      },
    });

    const selected = specialDay ?? baseSchedule;
    if (!selected || selected.isClosed) {
      return {
        fieldId,
        date,
        slots: [],
      };
    }

    const openTime = specialDay?.openTime ?? selected.openTime;
    const closeTime = specialDay?.closeTime ?? selected.closeTime;

    if (!openTime || !closeTime) {
      return {
        fieldId,
        date,
        slots: [],
      };
    }

    const openMinutes = this.toMinutes(openTime);
    const closeMinutes = this.toMinutes(closeTime);

    const [year, month, dayOfMonth] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, dayOfMonth));

    const bookings = await this.prisma.booking.findMany({
      where: {
        fieldId,
        status: { in: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'] },
        startTime: {
          lt: new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000),
        },
        endTime: {
          gt: bookingDate,
        },
      },
    });

    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        fieldId,
        startTime: {
          lt: new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000),
        },
        endTime: {
          gt: bookingDate,
        },
      },
    });

    const slots: Array<{ start: string; end: string; available: boolean }> = [];

    const now = new Date();
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    for (let current = openMinutes; current + 60 <= closeMinutes; current += 60) {
      const start = new Date(targetDayStart);
      start.setHours(Math.floor(current / 60), current % 60, 0, 0);

      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const isPast = start.getTime() < now.getTime();
      const overlappingBooking = bookings.some((booking) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        return start < bookingEnd && end > bookingStart;
      });
      const overlappingBlock = maintenanceBlocks.some((block) => {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);
        return start < blockEnd && end > blockStart;
      });

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        available: !isPast && !overlappingBooking && !overlappingBlock,
      });
    }

    return {
      fieldId,
      date,
      slots,
    };
  }

  private toMinutes(time: string) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }
}
