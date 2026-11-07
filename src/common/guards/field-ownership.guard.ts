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
export class FieldOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId?: string; role?: string };
      params: { id?: string };
    }>();

    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Avval tizimga kiring',
      });
    }

    const fieldId = request.params.id;

    if (!fieldId) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Maydon ID si kerak',
      });
    }

    const field = await this.prisma.field.findFirst({
      where: {
        id: fieldId,
        deletedAt: null,
        stadium: {
          is: { deletedAt: null },
        },
      },
      select: {
        stadium: {
          select: { ownerId: true },
        },
      },
    });

    if (!field) {
      throw new NotFoundException({
        error: ErrorCodes.FIELD_NOT_FOUND,
        message: 'Maydon yoki uning stadioni topilmadi',
      });
    }

    if (
      user.role === 'ADMIN' ||
      (user.role === 'OWNER' &&
        field.stadium.ownerId === user.userId)
    ) {
      return true;
    }

    throw new ForbiddenException({
      error: ErrorCodes.FORBIDDEN_RESOURCE,
      message: 'Bu maydonni boshqarishga ruxsatingiz yo‘q',
    });
  }
}