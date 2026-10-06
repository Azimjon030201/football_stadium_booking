import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { StadiumStatus } from '@prisma/client';

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

  async findAll(user?: { userId: string; role: string }) {
    if (user?.role === 'ADMIN') {
      return this.prisma.stadium.findMany({ where: { deletedAt: null } });
    }

    if (user?.userId) {
      return this.prisma.stadium.findMany({
        where: {
          deletedAt: null,
          OR: [{ status: StadiumStatus.ACTIVE }, { ownerId: user.userId }],
        },
      });
    }

    return this.prisma.stadium.findMany({
      where: { status: StadiumStatus.ACTIVE, deletedAt: null },
    });
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