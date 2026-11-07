import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleBookings() {
    const minutes = Number(process.env.PAYMENT_EXPIRATION_MINUTES) || 15;
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const result = await this.prisma.booking.updateMany({
      where: {
        status: { in: ['PENDING', 'PAYMENT_PENDING'] },
        createdAt: { lt: cutoff },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} ta muddati o'tgan bron EXPIRED qilindi`);
    }
  }
}