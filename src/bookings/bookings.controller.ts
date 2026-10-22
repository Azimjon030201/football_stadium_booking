import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: string;
  };
};

// Batafsil: Master Qo'llanma, 4-BOB (Tech Lead shaxsiy vazifalari)
@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Yangi bron yaratish' })
  @ApiCreatedResponse({ description: 'Bron muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri so‘rov ma’lumotlari' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Bron detali' })
  @ApiOkResponse({ description: 'Bron ma’lumoti muvaffaqiyatli olindi' })
  @ApiNotFoundResponse({ description: 'Bron topilmadi' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Bu bronni ko‘rishga ruxsat yo‘q' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.bookingsService.findOne(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Bronni bekor qilish' })
  @ApiOkResponse({ description: 'Bron muvaffaqiyatli bekor qilindi' })
  @ApiBadRequestResponse({ description: 'Bekor qilish uchun ma’lumotlar noto‘g‘ri' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Bronni bekor qilishga ruxsat yo‘q' })
  @ApiNotFoundResponse({ description: 'Bron topilmadi' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(id, req.user.userId, req.user.role, dto.reason);
  }
}
