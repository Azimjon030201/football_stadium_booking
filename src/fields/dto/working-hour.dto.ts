import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WorkingHourDto {
  @ApiProperty({ example: 0, description: '0-Yakshanba, ..., 6-Shanba' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'openTime "HH:mm" formatida bo\'lishi kerak' })
  openTime?: string;

  @ApiProperty({ example: '23:00', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closeTime "HH:mm" formatida bo\'lishi kerak' })
  closeTime?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed: boolean;
}

export class SetWorkingHoursDto {
  @ApiProperty({ type: [WorkingHourDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  hours: WorkingHourDto[];
}