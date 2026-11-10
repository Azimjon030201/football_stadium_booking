import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// FAILED'dan keyin PENDING'da qolgan bronlar "osilib" qolmasligi uchun xavfsizlik to'ri.
// Idempotent: status filtri tufayli qayta ishga tushsa ham zarar yo'q (TZ 35).
@Injectable()
export class ExpireUnpaidBookingsJob {
  private readonly log = new Logger(ExpireUnpaidBookingsJob.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    const ttl = Number(this.config.get('PAYMENT_EXPIRATION_MINUTES') ?? 15);
    const threshold = new Date(Date.now() - ttl * 60_000);
    try {
      await this.prisma.$transaction(async (tx) => {
        const stale = await tx.booking.findMany({
          where: { status: { in: ['PENDING', 'PAYMENT_PENDING'] }, createdAt: { lt: threshold } },
          select: { id: true },
        });
        if (!stale.length) return;
        const ids = stale.map((b) => b.id);
        await tx.booking.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRED' } });
        await tx.payment.updateMany({
          where: { bookingId: { in: ids }, status: { in: ['INITIATED', 'PENDING', 'FAILED'] } },
          data: { status: 'EXPIRED' },
        });
        this.log.log({ event: 'BOOKINGS_EXPIRED', count: ids.length });
      });
    } catch (e) {
      this.log.error('expire-unpaid-bookings failed', e as Error);
    }
  }
}
