import { Module } from '@nestjs/common';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';

@Module({
  imports: [PrismaModule],
  controllers: [StadiumsController],
  providers: [
    StadiumsService,
    RolesGuard,
    OwnershipGuard,
  ],
  exports: [StadiumsService],
})
export class StadiumsModule {}