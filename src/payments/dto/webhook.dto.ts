import { IsIn, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class WebhookDto {
  @IsString() @IsNotEmpty() transactionId: string;
  @IsString() @IsNotEmpty() bookingId: string;   // 7-vazifada IsUUID emas, oddiy test qiymat ham o'tsin
  @IsIn(['SUCCESS', 'FAILED']) status: 'SUCCESS' | 'FAILED';
  @IsNumber() @IsPositive() amount: number;
  @IsString() @IsNotEmpty() idempotencyKey: string;
}