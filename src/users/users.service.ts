import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Batafsil: Dev2 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // TASK-01: GET /users/me — passwordHash javobda bo'lmasligi kerak
  async getMe(userId: string) {
    throw new Error('TODO (Dev2 TASK-01): getMe() implement qilinmagan');
  }

  // TASK-02: PATCH /users/me — email o'zgartirilmaydi (immutable)
  async updateMe(userId: string, dto: UpdateProfileDto) {
    throw new Error('TODO (Dev2 TASK-02): updateMe() implement qilinmagan');
  }

  // TASK-10 (Hafta 3): GET /admin/users — pagination bilan
  async findAllForAdmin(page?: number, limit?: number) {
    throw new Error('TODO (Dev2 TASK-10): findAllForAdmin() implement qilinmagan');
  }

  // TASK-11 (Hafta 3): PATCH /admin/users/:id/block
  async setStatus(id: string, status: 'BLOCKED' | 'ACTIVE') {
    throw new Error('TODO (Dev2 TASK-11): setStatus() implement qilinmagan');
  }
}
