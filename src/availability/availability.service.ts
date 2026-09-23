import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Batafsil: Master Qo'llanma, 4-BOB (Tech Lead shaxsiy vazifalari).
// SRS 10-bo'lim: Availability Engine.
@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // GET /fields/:id/availability?date=YYYY-MM-DD
  // TODO:
  // 1) Field mavjudligi, isActive=true, Stadium ACTIVE ekanligini tekshiring
  // 2) Berilgan sana uchun Working Hours'ni oling (SpecialWorkingDay
  //    ustunlik qiladi, mavjud bo'lsa)
  // 3) slotDuration (default 60 daqiqa) asosida ish vaqti oynasini
  //    teng bo'laklarga bo'ling
  // 4) Shu Field+sana uchun band bronlarni (PENDING/PAYMENT_PENDING/
  //    CONFIRMED) va MaintenanceBlock'larni oling
  // 5) Har bir slot uchun overlap tekshiring (yarim-ochiq interval:
  //    A_start < B_end AND A_end > B_start)
  // 6) Bugungi kun uchun o'tgan vaqt slotlarini "unavailable" deb belgilang
  async getAvailability(fieldId: string, date: string) {
    throw new Error(
      'TODO (Tech Lead): AvailabilityService.getAvailability() implement qilinmagan',
    );
  }
}
