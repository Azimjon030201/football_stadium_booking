import {
  Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentWebhookDto } from './dto/webhook.dto';
import { WebhookSignatureGuard } from './webhook-signature.guard';
// Loyihangizdagi mavjud guard/decorator'lar:
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: { id: string }) {
    return this.payments.initiatePayment(dto.bookingId, user.id);
  }

  @Post('webhook/:provider')
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  webhook(@Param('provider') provider: string, @Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(provider, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.payments.findOne(id, user.id, user.role);
  }
}