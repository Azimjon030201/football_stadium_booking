import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// Batafsil: Master Qo'llanma, 4-BOB (Tech Lead shaxsiy vazifalari)
@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Yangi bron yaratish' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Bron detali' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.bookingsService.findOne(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Bronni bekor qilish' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(id, req.user.userId, req.user.role, dto.reason);
  }
}
