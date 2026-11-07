import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldStrongPass1', description: 'Hozirgi parol' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'NewStrongPass2', description: 'Yangi parol' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      "Parol kamida 8 belgi, 1 katta, 1 kichik harf va 1 raqam bo'lishi kerak",
  })
  newPassword: string;
}
