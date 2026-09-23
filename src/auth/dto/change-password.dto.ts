import { IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      "Parol kamida 8 belgi, 1 katta, 1 kichik harf va 1 raqam bo'lishi kerak",
  })
  newPassword: string;
}
