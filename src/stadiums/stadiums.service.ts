import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';

// Batafsil: Dev3 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.
@Injectable()
export class StadiumsService {
  constructor(private prisma: PrismaService) {}

  // TASK-01: POST /stadiums
  // - ownerId va status=DRAFT server tomonidan belgilanadi (DTO'da yo'q)
  async create(userId: string, dto: CreateStadiumDto) {
    throw new Error('TODO (Dev3 TASK-01): create() implement qilinmagan');
  }

  // TASK-02: GET /stadiums — faqat status=ACTIVE, qidiruv/filtr (Dev4 bilan)
  async findAll(params: any) {
    throw new Error('TODO (Dev3 TASK-02): findAll() implement qilinmagan');
  }

  // TASK-03: GET /stadiums/:id — ACTIVE bo'lmasa faqat egasi/admin (404)
  async findOne(id: string, currentUser?: { userId: string; role: string }) {
    throw new Error('TODO (Dev3 TASK-03): findOne() implement qilinmagan');
  }

  // TASK-04: PATCH /stadiums/:id — faqat egasi/admin (ownership tekshiruvi)
  async update(id: string, userId: string, role: string, dto: UpdateStadiumDto) {
    throw new Error('TODO (Dev3 TASK-04): update() implement qilinmagan');
  }

  // TASK-06, TASK-07 (Hafta 2): POST /stadiums/:id/submit — lifecycle
  async submit(id: string, userId: string) {
    throw new Error('TODO (Dev3 TASK-07): submit() implement qilinmagan');
  }

  // Admin moderatsiya (Hafta 3, agar PENDING oqimi tanlansa)
  async findAllForAdmin(status?: string) {
    throw new Error('TODO (Dev3 TASK-10): findAllForAdmin() implement qilinmagan');
  }

  async approve(id: string) {
    throw new Error('TODO (Dev3 TASK-11): approve() implement qilinmagan');
  }

  // TASK-12 (Hafta 3): DELETE /stadiums/:id — soft delete, faol bron tekshiruvi
  async archive(id: string, userId: string, role: string) {
    throw new Error('TODO (Dev3 TASK-12): archive() implement qilinmagan');
  }
}
