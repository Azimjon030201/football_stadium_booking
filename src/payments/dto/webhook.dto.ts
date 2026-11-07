import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PaymentWebhookDto {
  @IsString() transactionId: string;

  @IsUUID() bookingId: string;

  @IsString() idempotencyKey: string;

  @IsIn(['SUCCESS', 'FAILED']) status: 'SUCCESS' | 'FAILED';

  @IsNumber() amount: number;

  // Masalan "INSUFFICIENT_FUNDS" — faqat logga yoziladi
  @IsOptional() @IsString() @MaxLength(100) failureReason?: string;
}