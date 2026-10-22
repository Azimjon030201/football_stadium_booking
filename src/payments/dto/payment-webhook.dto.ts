import { IsIn, IsNumber, IsString, IsUUID } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  transactionId: string;

  @IsUUID()
  bookingId: string;

  @IsIn(['SUCCESS', 'FAILED'])
  status: 'SUCCESS' | 'FAILED';

  @IsNumber()
  amount: number;

  @IsString()
  idempotencyKey: string;
}