import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateFieldDto } from './create-field.dto';

export class UpdateFieldDto extends PartialType(CreateFieldDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
