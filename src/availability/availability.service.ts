import {
  BadRequestException,
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00+05:00`).getTime())) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'date YYYY-MM-DD formatida bo‘lishi kerak',
      });
    }

    const targetDate = new Date(`${date}T12:00:00+05:00`);
    const day = targetDate.getUTCDay();
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

    const dayStart = new Date(`${date}T00:00:00+05:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        fieldId,
        status: { in: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'] },
        startTime: {
          lt: dayEnd,
        },
        endTime: {
          gt: dayStart,
        },
      },
    });

    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        fieldId,
        startTime: {
          lt: dayEnd,
        },
        endTime: {
          gt: dayStart,
        },
      },
    });

    const slots: Array<{ start: string; end: string; available: boolean }> = [];

    const now = new Date();

    for (let current = openMinutes; current + 60 <= closeMinutes; current += 60) {
      const hh = String(Math.floor(current / 60)).padStart(2, '0');
      const mm = String(current % 60).padStart(2, '0');
      const start = new Date(`${date}T${hh}:${mm}:00+05:00`);
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
