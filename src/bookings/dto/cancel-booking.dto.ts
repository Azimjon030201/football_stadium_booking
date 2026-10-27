import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Iltimos, boshqa vaqtga o‘tkazib yuboring', description: 'Bekor qilish sababi' })
  @IsOptional()
  @IsString()
  reason?: string;
}
