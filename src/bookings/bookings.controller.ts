import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConflictResponseDto } from '../common/dto/conflict-response.dto';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: string;
  };
};

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Yangi bron yaratish' })
  @ApiCreatedResponse({ description: 'Bron muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri so‘rov ma’lumotlari' })
  @ApiConflictResponse({ description: "Ushbu vaqt oralig'ida maydon allaqachon band qilingan",
    type: ConflictResponseDto,
   })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiResponse({ status: 201, description: 'Bron muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto‘g‘ri so‘rov ma’lumotlari' })
  @ApiResponse({ status: 401, description: 'JWT token yaroqsiz' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo‘q' })
  @ApiResponse({ status: 404, description: 'Maydon yoki kategoriya topilmadi' })
  @ApiResponse({ status: 409, description: 'Vaqt oralig‘i band' })
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
  @ApiResponse({ status: 200, description: 'Bron ma’lumoti muvaffaqiyatli olindi' })
  @ApiResponse({ status: 401, description: 'JWT token yaroqsiz' })
  @ApiResponse({ status: 403, description: 'Bu bronni ko‘rishga ruxsat yo‘q' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  @ApiResponse({ status: 409, description: 'Vaqt oralig‘i band' })
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
  @ApiResponse({ status: 200, description: 'Bron muvaffaqiyatli bekor qilindi' })
  @ApiResponse({ status: 400, description: 'Bekor qilish uchun ma’lumotlar noto‘g‘ri' })
  @ApiResponse({ status: 401, description: 'JWT token yaroqsiz' })
  @ApiResponse({ status: 403, description: 'Bronni bekor qilishga ruxsat yo‘q' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  @ApiResponse({ status: 409, description: 'Bron allaqachon bekor qilingan yoki holati mos kelmayapti' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(id, req.user.userId, req.user.role, dto.reason);
  }
}
