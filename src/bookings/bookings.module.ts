import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, JwtAuthGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
