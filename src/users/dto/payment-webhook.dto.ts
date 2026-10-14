import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  transactionId: string;

  @IsIn(['SUCCESS', 'FAILED'])
  status: 'SUCCESS' | 'FAILED';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
