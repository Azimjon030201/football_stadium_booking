import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';

// Batafsil: Dev4 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.
// DIQQAT: Field modelida ownerId YO'Q — egalik field.stadium.ownerId
// orqali (nested) tekshiriladi.
@Injectable()
export class FieldsService {
  constructor(private prisma: PrismaService) {}

  // TASK-01: POST /stadiums/:stadiumId/fields
  async create(stadiumId: string, userId: string, role: string, dto: CreateFieldDto) {
    throw new Error('TODO (Dev4 TASK-01): create() implement qilinmagan');
  }

  // TASK-02: GET /stadiums/:stadiumId/fields
  async findByStadium(stadiumId: string) {
    throw new Error('TODO (Dev4 TASK-02): findByStadium() implement qilinmagan');
  }

  // TASK-03: GET /fields/:id
  async findOne(id: string) {
    throw new Error('TODO (Dev4 TASK-03): findOne() implement qilinmagan');
  }

  // TASK-04, TASK-07 (Hafta 2): PATCH /fields/:id (shu jumladan isActive)
  async update(id: string, userId: string, role: string, dto: UpdateFieldDto) {
    throw new Error('TODO (Dev4 TASK-04): update() implement qilinmagan');
  }

  // TASK-05: PUT /fields/:id/working-hours — UPSERT ishlatilishi shart
  async setWorkingHours(id: string, userId: string, role: string, hours: WorkingHourDto[]) {
    throw new Error('TODO (Dev4 TASK-05): setWorkingHours() implement qilinmagan');
  }

  async getWorkingHours(id: string) {
    throw new Error('TODO (Dev4 TASK-05): getWorkingHours() implement qilinmagan');
  }

  // TASK-11 (Hafta 3): DELETE /fields/:id — soft delete
  async remove(id: string, userId: string, role: string) {
    throw new Error('TODO (Dev4 TASK-11): remove() implement qilinmagan');
  }
}
