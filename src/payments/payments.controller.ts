import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

interface AuthUser {
  id: string;
  role: UserRole;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "To'lov holatini tekshirish (egasi / stadion egasi / Admin)" })
  @ApiResponse({ status: 200, description: "To'lov ma'lumoti" })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR (noto\'g\'ri UUID)' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN_RESOURCE' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.findOne(id, user.id, user.role);
  }
}