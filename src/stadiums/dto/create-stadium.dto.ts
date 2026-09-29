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
  @Length(3, 100)
  @IsString()
  name: string;

  @IsOptional()
  @MaxLength(2000)
  @IsString()
  description?: string;

  @Length(5, 200)
  @IsString()
  address: string;

  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNumber()
  @IsLongitude()
  longitude: number;

  @IsString()
  @Matches(/^\+998[0-9]{9}$/)
  phone: string;
}
