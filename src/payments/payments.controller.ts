import {
  Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@CurrentUser() user: { id: string }, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.id, dto);
  }

  // Auth yo'q, HMAC imzo bilan himoyalangan. Imzo xom (raw) body ustida tekshiriladi:
  // main.ts: NestFactory.create(AppModule, { rawBody: true })
  @Post('webhook/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const dto = plainToInstance(PaymentWebhookDto, req.body);
    try {
      await validateOrReject(dto, { whitelist: true });
    } catch {
      throw new BadRequestException({ error: 'VALIDATION_ERROR' });
    }
    return this.paymentsService.handleWebhook(provider, req.rawBody as Buffer, signature, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@CurrentUser() user: { id: string; role: any }, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getById(user, id);
  }
}