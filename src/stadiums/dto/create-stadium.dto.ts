import { IsLatitude, IsLongitude, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

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

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @Matches(/^\+998[0-9]{9}$/)
  phone: string;
}
