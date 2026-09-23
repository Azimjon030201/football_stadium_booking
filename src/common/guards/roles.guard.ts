import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// TASK-03 (Dev2, Hafta 1) — ENG MUHIM VAZIFANGIZ.
// Ishlatilishi: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
// MUHIM: JwtAuthGuard HAR DOIM RolesGuard'dan OLDIN yozilishi kerak —
// bu Guard req.user.role'ga tayanadi.
//
// TODO (Dev2 TASK-03):
// 1) Reflector orqali @Roles() bilan belgilangan ruxsat etilgan
//    rollar ro'yxatini o'qing (ROLES_KEY, context.getHandler()).
// 2) Agar @Roles() qo'yilmagan bo'lsa (requiredRoles undefined/bo'sh) —
//    true qaytaring (hammaga ochiq).
// 3) req.user.role shu ro'yxatda bor-yo'qligini tekshiring.
// 4) Mos kelmasa ForbiddenException({ error: 'FORBIDDEN_RESOURCE' })
//    tashlang.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Hozircha hammaga ochiq — implement qilinmaguncha demo/test uchun.
    // Implement qilgach, bu qatorni o'chiring.
    return true;
  }
}
