import { IsLatitude, IsLongitude, IsOptional, Length, Matches, MaxLength } from 'class-validator';

// DIQQAT: status va ownerId ataylab yo'q — bularni server o'zi belgilaydi.
// Batafsil: Dev3 qo'llanma, 6-BOB, TASK-01, TASK-05
export class CreateStadiumDto {
  @Length(3, 100)
  name: string;

  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @Length(5, 200)
  address: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @Matches(/^\+998[0-9]{9}$/)
  phone: string;
}
