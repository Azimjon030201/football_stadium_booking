import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// Quyidagi importlar SRS 31-bo'limdagi common/ papkasiga mos (yo'lni loyihangizga moslang)
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WebhookDto } from './dto/webhook.dto';
import { PaymentsService } from './payments.service';
import { WebhookSignatureGuard } from './webhook-signature.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "To'lovni boshlash" })
  initiate(@CurrentUser() user: { id: string }, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(user.id, dto.bookingId);
  }

  @Post('webhook/:provider')
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({ summary: 'Provayder callback (server-to-server, HMAC)' })
  webhook(@Param('provider') _provider: string, @Body() dto: WebhookDto) {
    return this.payments.handleWebhook(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.payments.findOne(id, user);
  }
}