import { Module } from '@nestjs/common';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StadiumsController],
  providers: [StadiumsService],
  exports: [StadiumsService],
})
export class StadiumsModule {}
