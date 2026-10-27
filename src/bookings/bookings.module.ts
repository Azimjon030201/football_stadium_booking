import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BookingExpiryService } from './booking-expiry.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, JwtAuthGuard, BookingExpiryService],
  exports: [BookingsService],
})
export class BookingsModule {}
