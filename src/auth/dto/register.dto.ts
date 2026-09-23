import { IsEmail, IsOptional, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @Matches(/^\+998[0-9]{9}$/, {
    message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak",
  })
  phone?: string;

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      "Parol kamida 8 belgi, 1 katta, 1 kichik harf va 1 raqam bo'lishi kerak",
  })
  password: string;

  @Length(2, 50)
  firstName: string;

  @Length(2, 50)
  lastName: string;
}
