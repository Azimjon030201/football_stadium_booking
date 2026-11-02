import { ApiProperty } from '@nestjs/swagger';
import {
  IsByteLength,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Foydalanuvchi email manzili',
  })
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  @MaxLength(254, { message: 'Email 254 belgidan oshmasligi kerak' })
  email: string;

  @ApiProperty({ example: 'StrongPass123', description: 'Parol' })
  @IsString({ message: 'Parol matn bo‘lishi kerak' })
  @IsNotEmpty({ message: 'Parol bo‘sh bo‘lmasligi kerak' })
  @IsByteLength(1, 72, {
    message: 'Parol 72 byte dan oshmasligi kerak',
  })
  password: string;
}
