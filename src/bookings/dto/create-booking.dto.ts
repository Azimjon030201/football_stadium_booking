import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'Field identifikatori' })
  @IsUUID()
  fieldId: string;

  @ApiProperty({ example: '2026-10-22T09:00:00.000Z', description: 'Bron boshlanish vaqti ISO formatda' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z', description: 'Bron tugash vaqti ISO formatda' })
  @IsDateString()
  endTime: string;
}
