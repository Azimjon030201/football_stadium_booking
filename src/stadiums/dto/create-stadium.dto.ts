import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Length,
  MaxLength,
  IsLatitude,
  IsLongitude,
  Matches,
} from 'class-validator';

export class CreateStadiumDto {
  @ApiProperty({ example: 'Bunyodkor Stadium', description: 'Stadion nomi' })
  @Length(3, 100)
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Zamonaviy mini-stadion', description: 'Tavsif' })
  @IsOptional()
  @MaxLength(2000)
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Chilonzor 10-mavze', description: 'Manzil' })
  @Length(5, 200)
  @IsString()
  address: string;

  @ApiProperty({ example: 41.2995, description: 'Геолокация (широта)' })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 69.2401, description: 'Геолокация (долгота)' })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: '+998901234567', description: 'Telefon raqam' })
  @IsString()
  @Matches(/^\+998[0-9]{9}$/)
  phone: string;
}