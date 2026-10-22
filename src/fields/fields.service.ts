import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCodes } from '../common/constants/error-codes';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';

@Injectable()
export class FieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    stadiumId: string,
    userId: string,
    role: string,
    dto: CreateFieldDto,
  ) {
    this.checkManager(userId, role);
    this.rejectNulls(dto);

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

    this.checkOwnership(stadium.ownerId, userId, role);

    return this.prisma.field.create({
      data: {
        stadiumId,
        name: this.cleanName(dto.name),
        fieldType: dto.fieldType,
        capacity: dto.capacity,
        size: dto.size,
        pricePerHour: dto.pricePerHour,
      },
    });
  }

  async findByStadium(stadiumId: string) {
    const stadium = await this.prisma.stadium.findFirst({
      where: {
        id: stadiumId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!stadium) {
      throw new NotFoundException({
        error: ErrorCodes.STADIUM_NOT_FOUND,
        message: 'Stadion topilmadi',
      });
    }

    return this.prisma.field.findMany({
      where: {
        stadiumId,
        deletedAt: null,
        isActive: true,
        stadium: {
          is: {
            deletedAt: null,
            status: 'ACTIVE',
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.field.findFirst({
      where: this.publicFieldWhere(id),
      include: {
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!field) {
      this.fieldNotFound();
    }

    return field;
  }

  async update(
    id: string,
    userId: string,
    role: string,
    dto: UpdateFieldDto,
  ) {
    await this.getManagedField(id, userId, role);
    this.rejectNulls(dto);

    const data: Prisma.FieldUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.cleanName(dto.name);
    }

    if (dto.fieldType !== undefined) {
      data.fieldType = dto.fieldType;
    }

    if (dto.capacity !== undefined) {
      data.capacity = dto.capacity;
    }

    if (dto.size !== undefined) {
      data.size = dto.size;
    }

    if (dto.pricePerHour !== undefined) {
      data.pricePerHour = dto.pricePerHour;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Kamida bitta maydon yuboring',
      });
    }

    try {
      return await this.prisma.field.update({
        where: {
          id,
          deletedAt: null,
          stadium: {
            is: {
              deletedAt: null,
              ...(role === 'ADMIN' ? {} : { ownerId: userId }),
            },
          },
        },
        data,
      });
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async setWorkingHours(
    id: string,
    userId: string,
    role: string,
    hours: WorkingHourDto[],
  ) {
    await this.getManagedField(id, userId, role);
    this.validateWorkingHours(hours);

    // Barcha 7 kun birgalikda saqlanadi yoki hech biri saqlanmaydi.
    const result = await this.prisma.$transaction(
      hours.map((hour) => {
        const data = {
          isClosed: hour.isClosed,
          openTime: hour.isClosed ? null : hour.openTime!,
          closeTime: hour.isClosed ? null : hour.closeTime!,
        };

        return this.prisma.workingHour.upsert({
          where: {
            fieldId_dayOfWeek: {
              fieldId: id,
              dayOfWeek: hour.dayOfWeek,
            },
          },
          create: {
            fieldId: id,
            dayOfWeek: hour.dayOfWeek,
            ...data,
          },
          update: data,
        });
      }),
    );

    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async getWorkingHours(id: string) {
    const field = await this.prisma.field.findFirst({
      where: this.publicFieldWhere(id),
      select: { id: true },
    });

    if (!field) {
      this.fieldNotFound();
    }

    return this.prisma.workingHour.findMany({
      where: { fieldId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async remove(
    id: string,
    userId: string,
    role: string,
  ) {
    await this.getManagedField(id, userId, role);

    try {
      await this.prisma.field.update({
        where: {
          id,
          deletedAt: null,
          stadium: {
            is: {
              deletedAt: null,
              ...(role === 'ADMIN' ? {} : { ownerId: userId }),
            },
          },
        },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    } catch (error: unknown) {
      this.handleWriteError(error);
    }

    return {
      id,
      message: 'Maydon o‘chirildi',
    };
  }

  private publicFieldWhere(id: string): Prisma.FieldWhereInput {
    return {
      id,
      deletedAt: null,
      isActive: true,
      stadium: {
        is: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
    };
  }

  private async getManagedField(
    id: string,
    userId: string,
    role: string,
  ) {
    this.checkManager(userId, role);

    const field = await this.prisma.field.findFirst({
      where: {
        id,
        deletedAt: null,
        stadium: {
          is: { deletedAt: null },
        },
      },
      select: {
        id: true,
        stadium: {
          select: { ownerId: true },
        },
      },
    });

    if (!field) {
      this.fieldNotFound();
    }

    this.checkOwnership(
      field.stadium.ownerId,
      userId,
      role,
    );

    return field;
  }

  private checkManager(userId: string, role: string): void {
    if (!userId) {
      throw new UnauthorizedException({
        error: ErrorCodes.UNAUTHORIZED,
        message: 'Avval tizimga kiring',
      });
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      this.forbidden();
    }
  }

  private checkOwnership(
    ownerId: string,
    userId: string,
    role: string,
  ): void {
    if (role !== 'ADMIN' && ownerId !== userId) {
      this.forbidden();
    }
  }

  private cleanName(name: string): string {
    const value = name.trim();

    if (!value) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Maydon nomi bo‘sh bo‘lishi mumkin emas',
      });
    }

    return value;
  }

  private rejectNulls(dto: object): void {
    if (Object.values(dto).some((value) => value === null)) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Maydonlarga null yuborish mumkin emas',
      });
    }
  }

  private validateWorkingHours(hours: WorkingHourDto[]): void {
    const invalid = (message: string): never => {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message,
      });
    };

    if (!Array.isArray(hours) || hours.length !== 7) {
      invalid('Haftaning barcha 7 kuni yuborilishi kerak');
    }

    const days = new Set<number>();
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const hour of hours) {
      if (
        !hour ||
        !Number.isInteger(hour.dayOfWeek) ||
        hour.dayOfWeek < 0 ||
        hour.dayOfWeek > 6
      ) {
        invalid('dayOfWeek 0 dan 6 gacha butun son bo‘lishi kerak');
      }

      if (days.has(hour.dayOfWeek)) {
        invalid('Hafta kunlari takrorlanishi mumkin emas');
      }

      days.add(hour.dayOfWeek);

      if (typeof hour.isClosed !== 'boolean') {
        invalid('isClosed boolean bo‘lishi kerak');
      }

      if (!hour.isClosed) {
        if (
          typeof hour.openTime !== 'string' ||
          typeof hour.closeTime !== 'string' ||
          !timePattern.test(hour.openTime) ||
          !timePattern.test(hour.closeTime)
        ) {
          invalid('Ochiq kun uchun openTime va closeTime HH:mm formatida kerak');
        }

        if (hour.openTime! >= hour.closeTime!) {
          invalid('openTime closeTime dan oldin bo‘lishi kerak');
        }
      }
    }
  }

  private fieldNotFound(): never {
    throw new NotFoundException({
      error: ErrorCodes.FIELD_NOT_FOUND,
      message: 'Maydon topilmadi',
    });
  }

  private forbidden(): never {
    throw new ForbiddenException({
      error: ErrorCodes.FORBIDDEN_RESOURCE,
      message: 'Bu maydonni boshqarishga ruxsatingiz yo‘q',
    });
  }

  private handleWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      this.fieldNotFound();
    }

    throw error;
  }
}