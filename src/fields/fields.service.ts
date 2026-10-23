import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';

@Injectable()
export class FieldsService {
  constructor(private prisma: PrismaService) {}

  async create(stadiumId: string, userId: string, role: string, dto: CreateFieldDto) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id: stadiumId, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (role !== 'ADMIN' && stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.field.create({
      data: {
        ...dto,
        fieldType: dto.fieldType as any,
        stadiumId,
        pricePerHour: new Prisma.Decimal(dto.pricePerHour.toString()),
      },
    });
  }

  async findByStadium(stadiumId: string) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id: stadiumId, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    return this.prisma.field.findMany({
      where: { stadiumId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.field.findFirst({
      where: { id, deletedAt: null },
      include: { stadium: true },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    return field;
  }

  async update(id: string, userId: string, role: string, dto: UpdateFieldDto) {
    const field = await this.prisma.field.findFirst({
      where: { id, deletedAt: null },
      include: { stadium: true },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (role !== 'ADMIN' && field.stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    const data: Prisma.FieldUpdateInput = { ...dto } as Prisma.FieldUpdateInput;

    if (dto.pricePerHour !== undefined) {
      data.pricePerHour = new Prisma.Decimal(dto.pricePerHour.toString());
    }

    return this.prisma.field.update({
      where: { id },
      data,
    });
  }

  async setWorkingHours(id: string, userId: string, role: string, hours: WorkingHourDto[]) {
    const field = await this.prisma.field.findFirst({
      where: { id, deletedAt: null },
      include: { stadium: true },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (role !== 'ADMIN' && field.stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    if (!Array.isArray(hours)) {
      throw new ConflictException({ error: 'VALIDATION_ERROR' });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const hour of hours) {
        await tx.workingHour.upsert({
          where: {
            fieldId_dayOfWeek: {
              fieldId: id,
              dayOfWeek: hour.dayOfWeek,
            },
          },
          update: {
            openTime: hour.openTime ?? null,
            closeTime: hour.closeTime ?? null,
            isClosed: hour.isClosed,
          },
          create: {
            fieldId: id,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime ?? null,
            closeTime: hour.closeTime ?? null,
            isClosed: hour.isClosed,
          },
        });
      }
    });

    return { updated: true, fieldId: id, count: hours.length };
  }

  async getWorkingHours(id: string) {
    const field = await this.prisma.field.findFirst({
      where: { id, deletedAt: null },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    return this.prisma.workingHour.findMany({
      where: { fieldId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async remove(id: string, userId: string, role: string) {
    const field = await this.prisma.field.findFirst({
      where: { id, deletedAt: null },
      include: { stadium: true },
    });

    if (!field) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (role !== 'ADMIN' && field.stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.field.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
