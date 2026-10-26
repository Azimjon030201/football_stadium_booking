import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ErrorCodes } from '../common/constants/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';
import { SearchStadiumDto } from './dto/search-stadium.dto';

@Injectable()
export class FieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async createField(stadiumId: string, userId: string, role: string, dto: CreateFieldDto) {
    const stadium = await this.prisma.stadium.findUnique({ where: { id: stadiumId } });
    if (!stadium || stadium.deletedAt) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.field.create({
      data: {
        ...dto,
        stadiumId,
        isActive: true,
      },
    });
  }

  async findByStadium(stadiumId: string) {
    const stadium = await this.prisma.stadium.findUnique({ where: { id: stadiumId } });
    if (!stadium || stadium.deletedAt || stadium.status !== 'ACTIVE') {
      return [];
    }

    return this.prisma.field.findMany({
      where: {
        stadiumId,
        deletedAt: null,
      },
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.field.findUnique({ where: { id } });
    if (!field || field.deletedAt) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }
    return field;
  }

  async updateField(id: string, userId: string, role: string, dto: UpdateFieldDto) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      include: { stadium: true },
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (field.stadium.ownerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.field.update({
      where: { id },
      data: dto,
    });
  }

  async setWorkingHours(fieldId: string, userId: string, role: string, hours: WorkingHourDto[]) {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
      include: { stadium: true },
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (field.stadium.ownerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    for (const h of hours) {
      if (!h.isClosed && (!h.openTime || !h.closeTime)) {
        throw new BadRequestException({
          error: ErrorCodes.VALIDATION_ERROR,
          message: 'Ochiq kunlar uchun openTime va closeTime kiritilishi kerak',
        });
      }
      if (!h.isClosed && h.openTime >= h.closeTime) {
        throw new BadRequestException({
          error: ErrorCodes.VALIDATION_ERROR,
          message: 'openTime closeTime dan kichik bo‘lishi kerak',
        });
      }
    }

    if (new Set(hours.map((hour) => hour.dayOfWeek)).size !== hours.length) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Har bir dayOfWeek faqat bir marta yuborilishi kerak',
      });
    }

    return this.prisma.$transaction(
      hours.map((h) =>
        this.prisma.workingHour.upsert({
          where: {
            fieldId_dayOfWeek: {
              fieldId,
              dayOfWeek: h.dayOfWeek,
            },
          },
          update: {
            openTime: h.isClosed ? null : h.openTime,
            closeTime: h.isClosed ? null : h.closeTime,
            isClosed: h.isClosed,
          },
          create: {
            fieldId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.isClosed ? null : h.openTime,
            closeTime: h.isClosed ? null : h.closeTime,
            isClosed: h.isClosed,
          },
        }),
      ),
    );
  }

  async searchStadiums(query: SearchStadiumDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * take;

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'minPrice maxPrice dan katta bo‘lishi mumkin emas',
      });
    }

    const filters: Prisma.StadiumWhereInput[] = [];

    if (query.search) {
      filters.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.minPrice !== undefined) {
      filters.push({
        fields: {
          some: { deletedAt: null },
        },
      });
      filters.push({
        fields: {
          none: {
            deletedAt: null,
            pricePerHour: { lt: query.minPrice },
          },
        },
      });
    }

    if (query.maxPrice !== undefined) {
      filters.push({
        fields: {
          some: {
            deletedAt: null,
            pricePerHour: { lte: query.maxPrice },
          },
        },
      });
    }

    if (query.fieldType) {
      filters.push({
        fields: {
          some: {
            deletedAt: null,
            fieldType: query.fieldType,
          },
        },
      });
    }

    if (query.capacity !== undefined) {
      filters.push({
        fields: {
          some: {
            deletedAt: null,
            capacity: { gte: query.capacity },
          },
        },
      });
    }

    if (query.minRating !== undefined) {
      filters.push({ averageRating: { gte: query.minRating } });
    }

    const whereCondition: Prisma.StadiumWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
      AND: filters,
    };

    const [data, total] = await Promise.all([
      this.prisma.stadium.findMany({
        where: whereCondition,
        skip,
        take,
        include: {
          fields: { where: { deletedAt: null } },
        },
      }),
      this.prisma.stadium.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async removeField(id: string, userId: string, role: string) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      include: { stadium: true },
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException({ error: 'FIELD_NOT_FOUND' });
    }

    if (field.stadium.ownerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.field.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}