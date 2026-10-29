import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ErrorCodes } from '../common/constants/error-codes';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isOwnerVerified: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // TASK-01: Profilni olish
  async getMe(userId: string) {
    this.checkUserId(userId);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException({
        error: ErrorCodes.USER_NOT_FOUND,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    return user;
  }

  // TASK-02: Profilni tahrirlash
  async updateMe(userId: string, dto: UpdateProfileDto) {
    this.checkUserId(userId);

    if (
      dto.firstName === null ||
      dto.lastName === null ||
      dto.phone === null
    ) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Profil maydonlariga null yuborish mumkin emas',
      });
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
          deletedAt: null,
          status: { not: 'DELETED' },
        },
        data,
        select: userSelect,
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  // TASK-10: Admin uchun pagination
  async findAllForAdmin(page = 1, limit = 20) {
    const currentPage = Number(page);
    const requestedLimit = Number(limit);

    if (
      !Number.isSafeInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isSafeInteger(requestedLimit) ||
      requestedLimit < 1
    ) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'page va limit musbat butun son bo‘lishi kerak',
      });
    }

    const take = Math.min(requestedLimit, 100);
    const skip = (currentPage - 1) * take;

    if (!Number.isSafeInteger(skip)) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Sahifa raqami juda katta',
      });
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        select: userSelect,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // TASK-11: Block / unblock
  async setStatus(
    id: string,
    status: 'BLOCKED' | 'ACTIVE',
    actorId?: string,
  ) {
    if (status !== 'BLOCKED' && status !== 'ACTIVE') {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'status faqat BLOCKED yoki ACTIVE bo‘lishi mumkin',
      });
    }

    if (!id) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Foydalanuvchi ID si kerak',
      });
    }

    if (actorId && actorId === id && status === 'BLOCKED') {
      throw new ForbiddenException({
        error: ErrorCodes.FORBIDDEN_RESOURCE,
        message: 'Administrator o‘zini bloklay olmaydi',
      });
    }

    try {
      return await this.prisma.user.update({
        where: {
          id,
          deletedAt: null,
          status: { not: 'DELETED' },
        },
        data: { status },
        select: userSelect,
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private checkUserId(userId: string): void {
    if (!userId) {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Token orqali foydalanuvchi aniqlanmadi',
      });
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException({
          error: ErrorCodes.USER_ALREADY_EXISTS,
          message: 'Bu telefon raqami boshqa foydalanuvchida mavjud',
        });
      }

      if (error.code === 'P2025') {
        throw new NotFoundException({
          error: ErrorCodes.USER_NOT_FOUND,
          message: 'Foydalanuvchi topilmadi yoki o‘chirilgan',
        });
      }
    }

    throw error;
  }
}