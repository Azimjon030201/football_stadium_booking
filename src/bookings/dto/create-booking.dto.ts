import { IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  fieldId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}
