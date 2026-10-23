import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

class InitiatePaymentRequestDto {
  @ApiProperty({
    description: 'To‘lov qilinadigan bron ID si',
    format: 'uuid',
  })
  @IsUUID()
  bookingId!: string;
}

interface AuthUser {
  userId: string;
  role: UserRole;
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Bron uchun to‘lovni boshlash' })
  @ApiResponse({ status: 201, description: 'To‘lov boshlandi' })
  @ApiResponse({ status: 400, description: 'Bron holati noto‘g‘ri' })
  @ApiResponse({ status: 403, description: 'Bron sizga tegishli emas' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  initiatePayment(
    @Body() dto: InitiatePaymentRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.initiatePayment(
      dto.bookingId,
      user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'To‘lov holatini tekshirish (egasi / stadion egasi / Admin)',
  })
  @ApiResponse({ status: 200, description: 'To‘lov ma’lumoti' })
  @ApiResponse({ status: 400, description: 'Noto‘g‘ri UUID' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN_RESOURCE' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.findOne(
      id,
      user.userId,
      user.role,
    );
  }
}