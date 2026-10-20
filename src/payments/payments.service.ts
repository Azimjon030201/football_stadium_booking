import { Injectable, Logger } from '@nestjs/common';
import { WebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async handleWebhook(dto: WebhookDto) {
    this.logger.log(`Webhook received: ${JSON.stringify(dto)}`);
    // TODO 8: idempotencyKey tekshiruvi
    // TODO 9: Payment va Booking statusini yangilash
    return { received: true };
  }
}