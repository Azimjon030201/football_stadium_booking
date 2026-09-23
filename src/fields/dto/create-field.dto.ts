import { IsEnum, IsInt, IsOptional, IsPositive, Length } from 'class-validator';

// Batafsil: Dev4 qo'llanma, 6-BOB, TASK-01, TASK-06
export class CreateFieldDto {
  @Length(1, 100)
  name: string;

  @IsEnum(['INDOOR', 'OUTDOOR', 'NATURAL_GRASS', 'ARTIFICIAL_GRASS'])
  fieldType: string;

  @IsInt()
  @IsPositive()
  capacity: number;

  @IsOptional()
  size?: string;

  @IsPositive()
  pricePerHour: number;
}
