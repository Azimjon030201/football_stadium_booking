import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerBookingsQueryDto } from './dto/owner-bookings-query.dto (1)';

@Injectable()
export class OwnerService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /owner/bookings (TZ 25.8)
  async getBookings(user: { id: string; role: UserRole }, q: OwnerBookingsQueryDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 100);

    const startTime: Prisma.DateTimeFilter = {};
    if (q.from) startTime.gte = new Date(q.from);
    if (q.to) startTime.lt = new Date(q.to);

    // Stadium -> Field -> Booking zanjiri. ownerId sharti har doim token'dan olinadi;
    // stadiumId/fieldId filtrlari uni faqat TORAYTIRADI, hech qachon almashtira olmaydi.
    // deletedAt filtri ATAYLAB yo'q: arxivlangan stadion/field bronlari tarixda ko'rinadi (BR-029).
    const where: Prisma.BookingWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to ? { startTime } : {}),
      field: {
        ...(q.fieldId ? { id: q.fieldId } : {}),
        stadium: {
          ...(user.role === UserRole.ADMIN ? {} : { ownerId: user.id }),
          ...(q.stadiumId ? { id: q.stadiumId } : {}),
        },
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { startTime: q.order ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          duration: true,
          price: true,
          status: true,
          cancellationReason: true,
          createdAt: true,
          // passwordHash/email chiqmasligi uchun user: true ISHLATILMAYDI
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          field: {
            select: { id: true, name: true, stadium: { select: { id: true, name: true } } },
          },
          payment: { select: { status: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
