import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller (1)';
import { OwnerService } from './owner.service (1)';

@Module({
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
