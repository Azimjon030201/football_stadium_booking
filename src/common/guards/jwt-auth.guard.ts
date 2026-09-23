import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// TASK-05 (Dev1, Hafta 1): asosiy holat — shu bare guard yetarli.
// Barcha himoyalangan endpoint'lar shu orqali o'tadi: @UseGuards(JwtAuthGuard)
//
// TODO (Dev2 TASK-12, Hafta 3): kengaytiring — har bir so'rovda
// foydalanuvchi hali BLOCKED bo'lmaganini bazadan qayta tekshiring
// (faqat login paytida tekshirish yetarli emas, chunki token amal
// qilsa ham, foydalanuvchi keyinroq bloklangan bo'lishi mumkin).
// Buning uchun canActivate() metodini override qiling va PrismaService'ni
// constructor orqali inject qiling.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
