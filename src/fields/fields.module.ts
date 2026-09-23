import { Module } from '@nestjs/common';
import { FieldsController } from './fields.controller';
import { FieldsService } from './fields.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [FieldsController],
  providers: [FieldsService, JwtAuthGuard],
  exports: [FieldsService],
})
export class FieldsModule {}
