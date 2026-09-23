import { Module } from '@nestjs/common';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [StadiumsController],
  providers: [StadiumsService, JwtAuthGuard],
  exports: [StadiumsService],
})
export class StadiumsModule {}
