import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

// Batafsil: Dev4 qo'llanma, 6-BOB, TASK-05
export class WorkingHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Yakshanba ... 6=Shanba

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:mm formatida bo\'lishi kerak' })
  openTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'HH:mm formatida bo\'lishi kerak' })
  closeTime?: string;

  @IsBoolean()
  isClosed: boolean;
}
