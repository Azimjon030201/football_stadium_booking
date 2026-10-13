import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class WebhookDto {
  @ApiProperty({ example: 'mock-tx-9981' })
  @IsString()
  transactionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({ enum: ['SUCCESS', 'FAILED'] })
  @IsIn(['SUCCESS', 'FAILED'])
  status: 'SUCCESS' | 'FAILED';

  @ApiProperty({ example: 150000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 'idem-9981' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
