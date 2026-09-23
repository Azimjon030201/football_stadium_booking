import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// Batafsil: Dev5 qo'llanma (6-BOB), TASK-04 dan TASK-11 gacha
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiOperation({ summary: "To'lovni boshlash" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(@Req() req, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(dto.bookingId, req.user.userId);
  }

  @ApiOperation({ summary: "Provayder webhook (Guard YO'Q — server-to-server)" })
  @Post('webhook/mock')
  webhook(@Body() dto: WebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }

  @ApiOperation({ summary: "To'lov holatini ko'rish" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.paymentsService.findOne(id, req.user.userId, req.user.role);
  }
}
