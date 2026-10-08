import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Faqat bookingId. "amount" yuborilsa global ValidationPipe
// (whitelist + forbidNonWhitelisted) 400 qaytaradi.
export class InitiatePaymentDto {
  @ApiProperty({ example: 'b3f1c2a4-1d2e-4c5f-9a8b-7e6d5c4b3a21' })
  @IsUUID()
  bookingId: string;
}