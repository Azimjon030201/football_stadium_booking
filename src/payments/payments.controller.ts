import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// MOSLANG: quyidagi 2 import yo'llarini loyihangizdagiga o'zgartiring
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "To'lovni boshlash (summa bazadagi bron narxidan)" })
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser('id') userId: string) {
    return this.payments.initiate(dto.bookingId, userId);
  }
}