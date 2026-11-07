import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, Length } from 'class-validator';

// Batafsil: Dev4 qo'llanma, 6-BOB, TASK-01, TASK-06
export class CreateFieldDto {
  @ApiProperty({ example: 'Mini Football 5x5', description: 'Field nomi' })
  @Length(1, 100)
  name: string;

  @ApiProperty({
    example: 'INDOOR',
    description: 'Field turi',
    enum: ['INDOOR', 'OUTDOOR', 'NATURAL_GRASS', 'ARTIFICIAL_GRASS'],
  })
  @IsEnum(['INDOOR', 'OUTDOOR', 'NATURAL_GRASS', 'ARTIFICIAL_GRASS'])
  fieldType: string;

  @ApiProperty({ example: 10, description: "O'yinchi sig'imi" })
  @IsInt()
  @IsPositive()
  capacity: number;

  @ApiPropertyOptional({ example: '25x15 m', description: 'Field hajmi' })
  @IsOptional()
  size?: string;

  @ApiProperty({ example: 200000, description: 'Soatlik narx' })
  @IsPositive()
  pricePerHour: number;
}
