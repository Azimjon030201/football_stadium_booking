import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { Prisma, StadiumStatus } from '@prisma/client';
import { QueryStadiumsDto } from './dto/query-stadiums.dto';

@Injectable()
export class StadiumsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStadiumDto, ownerId: string) {
    return this.prisma.stadium.create({
      data: {
        ...dto,
        ownerId,
        status: StadiumStatus.DRAFT,
      },
    });
  }

  async findAll(
    user?: { userId: string; role: string },
    query: QueryStadiumsDto = new QueryStadiumsDto(),
  ) {
    let where: Prisma.StadiumWhereInput;

    if (user?.role === 'ADMIN') {
      where = { deletedAt: null };
    } else if (user?.userId) {
      where = {
        deletedAt: null,
        OR: [{ status: StadiumStatus.ACTIVE }, { ownerId: user.userId }],
      };
    } else {
      where = { status: StadiumStatus.ACTIVE, deletedAt: null };
    }

    const extraFilters: Prisma.StadiumWhereInput[] = [];
    const hasFieldFilter =
      query.fieldType !== undefined ||
      query.minPrice !== undefined ||
      query.maxPrice !== undefined;

    if (hasFieldFilter) {
      const fieldFilter: Prisma.FieldWhereInput = {
        deletedAt: null,
        isActive: true,
      };
      if (query.fieldType) fieldFilter.fieldType = query.fieldType;
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        fieldFilter.pricePerHour = {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        };
      }
      extraFilters.push({ fields: { some: fieldFilter } });
    }

    if (query.search) {
      extraFilters.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (extraFilters.length > 0) {
      where = { AND: [where, ...extraFilters] };
    }

    const page = Math.max(1, query.page || 1);
    const take = Math.min(Math.max(1, query.limit || 20), 100);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.stadium.findMany({
        where,
        skip,
        take,
        include: {
          fields: {
            where: { deletedAt: null },
          },
        },
      }),
      this.prisma.stadium.count({ where }),
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

  async findOne(id: string, user?: { userId: string; role: string }) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    const isOwner = user?.userId === stadium.ownerId;
    const isAdmin = user?.role === 'ADMIN';

    if (stadium.status !== StadiumStatus.ACTIVE && !isOwner && !isAdmin) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return stadium;
  }

  async update(id: string, dto: UpdateStadiumDto, userId: string) {
    const stadium = await this.prisma.stadium.findUnique({ where: { id } });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const stadium = await this.prisma.stadium.findUnique({ where: { id } });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async submit(id: string, userId: string) {
    const stadium = await this.prisma.stadium.findUnique({ where: { id } });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    if (stadium.status !== StadiumStatus.DRAFT) {
      throw new ConflictException({ error: 'STADIUM_INVALID_STATE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: { status: StadiumStatus.ACTIVE },
    });
  }
}