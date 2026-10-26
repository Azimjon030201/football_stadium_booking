import { IsString, IsEnum, IsInt, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FieldType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
  NATURAL_GRASS = 'NATURAL_GRASS',
  ARTIFICIAL_GRASS = 'ARTIFICIAL_GRASS',
}

export class CreateFieldDto {
  @ApiProperty({ example: 'Maydon 1 (Yopiq)' })
  @IsString()
  name: string;

  @ApiProperty({ enum: FieldType, example: FieldType.INDOOR })
  @IsEnum(FieldType)
  fieldType: FieldType;

  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  capacity: number;

  @ApiProperty({ example: '40x20m', required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ example: 150000 })
  @IsPositive()
  pricePerHour: number;
}