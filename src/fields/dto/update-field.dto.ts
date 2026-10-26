import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateFieldDto } from './create-field.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFieldDto extends PartialType(CreateFieldDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}