import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '../constants/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user?: {
        userId?: string;
        role?: UserRole;
      };
    }>();

    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Token orqali foydalanuvchi aniqlanmadi',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status === 'DELETED') {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Foydalanuvchi mavjud emas yoki o‘chirilgan',
      });
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException({
        error: ErrorCodes.USER_BLOCKED,
        message: 'Hisobingiz bloklangan',
      });
    }

    request.user = {
      ...request.user,
      userId: user.id,
      role: user.role,
    };

    return true;
  }
}