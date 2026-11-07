import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Abror',
    minLength: 2,
    maxLength: 50,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Xoshimov',
    minLength: 2,
    maxLength: 50,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^\+998[0-9]{9}$/, {
    message: 'Telefon +998901234567 formatida bo‘lishi kerak',
  })
  phone?: string;
}