import { IsOptional, Length, Matches } from 'class-validator';

// DIQQAT: email maydoni ataylab yo'q — email immutable (Assumption A-03).
// Batafsil: Dev2 qo'llanma, 6-BOB, TASK-02
export class UpdateProfileDto {
  @IsOptional()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @Matches(/^\+998[0-9]{9}$/)
  phone?: string;
}
