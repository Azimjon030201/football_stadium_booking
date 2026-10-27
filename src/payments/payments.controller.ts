import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

export class InitiatePaymentDto {
  @IsUUID()
  bookingId: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser('id') userId: string) {
    return this.payments.initiate(dto.bookingId, userId);
  }

  // Public, lekin production'da HMAC signature guard bilan himoyalanadi (SRS 25.6)
  @Post('webhook/:provider')
  @HttpCode(200)
  webhook(@Param('provider') _provider: string, @Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(dto);
  }
}