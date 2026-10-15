
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "To'lovni boshlash" })
  @ApiResponse({ status: 201, description: "To'lov boshlandi" })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR / BOOKING_INVALID_STATE' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN_RESOURCE' })
  @ApiResponse({ status: 404, description: 'BOOKING_NOT_FOUND' })
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiatePayment(dto.bookingId, userId);
  }
}