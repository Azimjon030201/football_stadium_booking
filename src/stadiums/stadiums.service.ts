import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { QueryStadiumsDto } from './dto/query-stadiums.dto';
import { Prisma, StadiumStatus } from '@prisma/client';

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

  async findAll(query: QueryStadiumsDto, user?: { userId: string; role: string }) {
    const { page, limit } = query;
    let where: Prisma.StadiumWhereInput = { deletedAt: null };

    if (user?.role === 'ADMIN') {
      where = { deletedAt: null };
    } else if (user?.userId) {
      where = {
        deletedAt: null,
        OR: [{ status: StadiumStatus.ACTIVE }, { ownerId: user.userId }],
      };
    } else {
      where = { deletedAt: null, status: StadiumStatus.ACTIVE };
    }

    const [data, total] = await Promise.all([
      this.prisma.stadium.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stadium.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

  async update(id: string, dto: UpdateStadiumDto, user: { userId: string; role: string }) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    this.assertCanManage(stadium.ownerId, user);

    return this.prisma.stadium.update({
      where: { id },
      data: dto,
    });
  }

  async archive(id: string, user: { userId: string; role: string }) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    this.assertCanManage(stadium.ownerId, user);

    return this.prisma.stadium.update({
      where: { id },
      data: {
        status: StadiumStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    });
  }

  async submit(id: string, userId: string) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id, deletedAt: null },
    });

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
      data: { status: StadiumStatus.PENDING }, 
    });
  }

  async getAdminStadiums(status?: string) {
    return this.prisma.stadium.findMany({
      where: status ? { status: status as StadiumStatus } : {},
    });
  }

  async approve(id: string) {
    const stadium = await this.prisma.stadium.findFirst({
      where: { id, deletedAt: null },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.status !== StadiumStatus.PENDING) {
      throw new ConflictException({ error: 'STADIUM_INVALID_STATE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: { status: StadiumStatus.ACTIVE },
    });
  }

  private assertCanManage(ownerId: string, user: { userId: string; role: string }) {
    if (user.role !== 'ADMIN' && user.userId !== ownerId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }
  }
}