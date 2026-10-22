import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  Max,
  ValidateIf,
} from 'class-validator';

export class CreateFieldDto {
  @ApiProperty({ example: 'Asosiy maydon' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    enum: FieldType,
    example: FieldType.ARTIFICIAL_GRASS,
  })
  @IsEnum(FieldType)
  fieldType!: FieldType;

  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  @Max(2147483647)
  capacity!: number;

  @ApiPropertyOptional({ example: '20x40' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  size?: string;

  @ApiProperty({ example: 150000 })
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
    maxDecimalPlaces: 2,
  })
  @IsPositive()
  @Max(99999999.99)
  pricePerHour!: number;
}