import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'b1e0c1a2-0000-4000-8000-000000000001' })
  @IsUUID()
  bookingId: string;
}