import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '../constants/error-codes';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId?: string; role?: string };
      params: { id?: string; stadiumId?: string };
    }>();

    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Avval tizimga kiring',
      });
    }

    const stadiumId = request.params.stadiumId ?? request.params.id;

    if (!stadiumId) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Stadion ID si kerak',
      });
    }

    const stadium = await this.prisma.stadium.findFirst({
      where: {
        id: stadiumId,
        deletedAt: null,
      },
      select: { ownerId: true },
    });

    if (!stadium) {
      throw new NotFoundException({
        error: ErrorCodes.STADIUM_NOT_FOUND,
        message: 'Stadion topilmadi',
      });
    }

    if (
      user.role === 'ADMIN' ||
      (user.role === 'OWNER' && stadium.ownerId === user.userId)
    ) {
      return true;
    }

    throw new ForbiddenException({
      error: ErrorCodes.FORBIDDEN_RESOURCE,
      message: 'Bu stadionni boshqarishga ruxsatingiz yo‘q',
    });
  }
}