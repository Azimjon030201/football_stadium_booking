import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';

@Injectable()
export class StadiumsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStadiumDto) {
    return this.prisma.stadium.create({
      data: {
        ...dto,
        ownerId: userId,
        status: 'DRAFT',
      },
    });
  }

  async findAll(params: any) {
    const { search, minPrice, maxPrice, fieldType, page = 1, limit = 10 } = params || {};

    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.stadium.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
  }

  async findOne(id: string, currentUser?: { userId: string; role: string }) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { id },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    const isOwner = currentUser && stadium.ownerId === currentUser.userId;
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    if (stadium.status !== 'ACTIVE' && !isOwner && !isAdmin) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    return stadium;
  }

  async update(
    id: string,
    userId: string,
    role: string,
    dto: UpdateStadiumDto,
  ) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { id },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: dto,
    });
  }

  async submit(id: string, userId: string) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { id },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    if (stadium.ownerId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  async findAllForAdmin(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.stadium.findMany({
      where,
    });
  }

  async approve(id: string) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { id },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }

    return this.prisma.stadium.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async archive(id: string, userId: string, role: string) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { id },
    });

    if (!stadium) {
      throw new NotFoundException({ error: 'STADIUM_NOT_FOUND' });
    }
  }
}