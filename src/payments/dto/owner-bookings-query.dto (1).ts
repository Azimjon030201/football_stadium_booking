import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Min } from 'class-validator';

export class OwnerBookingsQueryDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;

  @IsOptional() @IsUUID() stadiumId?: string;
  @IsOptional() @IsUUID() fieldId?: string;

  // startTime oralig'i: from <= startTime < to (ISO 8601, offset bilan)
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;

  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;

  // TZ 38: limit > 100 xato emas, 100 ga cheklanadi => @Max yo'q
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
