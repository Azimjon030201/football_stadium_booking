import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

// Batafsil: Master Qo'llanma, 4-BOB (Tech Lead shaxsiy vazifalari).
// Bu modul — loyihaning eng kritik qismi: double-booking prevention.
@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // Hafta 2: POST /bookings
  // TODO:
  // 1) Field mavjudligi, isActive=true, Stadium ACTIVE ekanligini tekshiring
  // 2) Working Hours asosida so'ralgan vaqt oralig'i ish vaqti ichida ekanligini
  //    tekshiring (BOOKING_OUTSIDE_WORKING_HOURS)
  // 3) O'tgan vaqt uchun bron rad etiladi (BOOKING_PAST_TIME)
  // 4) Min/max davomiylik: 60-180 daqiqa (BOOKING_INVALID_DURATION)
  // 5) Narxni backend hisoblaydi (frontend'dan kelgan narxga ishonilmaydi)
  // 6) $transaction(Serializable) ichida overlap tekshiruvi + INSERT
  // 7) DB darajasida GiST Exclusion Constraint (raw SQL migration,
  //    SRS 12.3-band) — bu yagona haqiqiy double-booking himoyasi
  async create(userId: string, dto: CreateBookingDto) {
    throw new Error('TODO (Tech Lead): BookingsService.create() implement qilinmagan');
  }

  // Hafta 2: GET /bookings/:id
  async findOne(id: string, userId: string, role: string) {
    throw new Error('TODO (Tech Lead): BookingsService.findOne() implement qilinmagan');
  }

  // Hafta 2-3: POST /bookings/:id/cancel
  // TODO: 14-bo'limdagi cancellation deadline qoidasi (120 daqiqa)
  async cancel(id: string, userId: string, role: string, reason?: string) {
    throw new Error('TODO (Tech Lead): BookingsService.cancel() implement qilinmagan');
  }
}
