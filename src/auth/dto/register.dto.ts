import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Foydalanuvchi email manzili' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Telefon raqam' })
  @IsOptional()
  @Matches(/^\+998[0-9]{9}$/, {
    message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak",
  })
  phone?: string;

  @ApiProperty({ example: 'StrongPass123', description: 'Parol (kamida 8 belgidan iborat)' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      "Parol kamida 8 belgi, 1 katta, 1 kichik harf va 1 raqam bo'lishi kerak",
  })
  password: string;

  @ApiProperty({ example: 'Ali', description: 'Ism' })
  @Length(2, 50)
  firstName: string;

  @ApiProperty({ example: 'Valiyev', description: 'Familiya' })
  @Length(2, 50)
  lastName: string;
}
