import { IsOptional, IsString, Length, Matches } from 'class-validator';

// DIQQAT: email ataylab yo'q — email o'zgarmaydi (Assumption A-03).
export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 50)
  firstName?: string;

  @IsOptional() @IsString() @Length(2, 50)
  lastName?: string;

  @IsOptional() @IsString()
  @Matches(/^\+998[0-9]{9}$/, { message: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;
}
