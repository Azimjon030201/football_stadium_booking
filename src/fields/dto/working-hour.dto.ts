import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

// Batafsil: Dev4 qo'llanma, 6-BOB, TASK-05
export class WorkingHourDto {
  @ApiProperty({ example: 1, description: 'Hafta kuni: 0=Yakshanba ... 6=Shanba' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Yakshanba ... 6=Shanba

  @ApiPropertyOptional({ example: '09:00', description: 'Ochilish vaqti' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:mm formatida bo\'lishi kerak' })
  openTime?: string;

  @ApiPropertyOptional({ example: '23:00', description: 'Yopilish vaqti' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:mm formatida bo\'lishi kerak' })
  closeTime?: string;

  @ApiProperty({ example: false, description: 'Ushbu kun yopiq bo‘lsa true' })
  @IsBoolean()
  isClosed: boolean;
}
