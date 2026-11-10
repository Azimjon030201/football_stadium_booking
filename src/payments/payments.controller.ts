import { Body, Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
//import { PaymentWebhookDto } from './dto/payment-webhook.dto'; 
import { PaymentWebhookDto } from './dto/webhook.dto';
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook/:provider')
  @HttpCode(200)
  webhook(@Param('provider') provider: string, @Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(provider, dto);
  }
}