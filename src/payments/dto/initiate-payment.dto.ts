import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentProviderType } from '@prisma/client';

export class InitiatePaymentDto {
  @IsUUID()
  bookingId: string;

  // MVP'da default MOCK
  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;
}