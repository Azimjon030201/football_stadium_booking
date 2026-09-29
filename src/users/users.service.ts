import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

// Batafsil: Dev2 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // TASK-01: GET /users/me — passwordHash javobda bo'lmasligi kerak

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isOwnerVerified: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // TASK-02: PATCH /users/me — email o'zgartirilmaydi (immutable)

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(dto.firstName !== undefined && {
          firstName: dto.firstName,
        }),

        ...(dto.lastName !== undefined && {
          lastName: dto.lastName,
        }),

        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isOwnerVerified: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  // TASK-10 (Hafta 3): GET /admin/users — pagination bilan

  async findAllForAdmin(page?: number, limit?: number) {
    throw new Error(
      'TODO (Dev2 TASK-10): findAllForAdmin() implement qilinmagan',
    );
  }

  // TASK-11 (Hafta 3): PATCH /admin/users/:id/block

  async setStatus(id: string, status: 'BLOCKED' | 'ACTIVE') {
    throw new Error(
      'TODO (Dev2 TASK-11): setStatus() implement qilinmagan',
    );
  }
}