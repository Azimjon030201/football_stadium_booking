import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Foydalanuvchi email manzili' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123', description: 'Parol' })
  @IsString()
  password: string;
}
