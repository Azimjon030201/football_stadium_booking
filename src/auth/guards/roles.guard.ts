import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorCodes } from '../constants/error-codes';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1) @Roles(...) ni metod yoki klass darajasidan o'qiymiz
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2) @Roles qo'yilmagan bo'lsa — hammaga ochiq
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // 3) JwtAuthGuard o'rnatgan req.user dan rolni olamiz
    const { user } = context.switchToHttp().getRequest();

    // 4) Mos kelmasa — 403
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({ error: ErrorCodes.FORBIDDEN_RESOURCE });
    }
    return true;
  }
}
