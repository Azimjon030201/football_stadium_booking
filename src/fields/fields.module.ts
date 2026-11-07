import { Module } from '@nestjs/common';
import { FieldsController } from './fields.controller';
import { FieldsService } from './fields.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { FieldOwnershipGuard } from '../common/guards/field-ownership.guard';

@Module({
  imports: [PrismaModule],
  controllers: [FieldsController],
  providers: [
    FieldsService,
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
    FieldOwnershipGuard,
  ],
  exports: [FieldsService],
})
export class FieldsModule {}