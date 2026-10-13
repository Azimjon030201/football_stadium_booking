import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: ['BLOCKED', 'ACTIVE'],
    example: 'BLOCKED',
  })
  @IsIn(['BLOCKED', 'ACTIVE'], {
    message: 'status faqat BLOCKED yoki ACTIVE bo‘lishi mumkin',
  })
  status!: 'BLOCKED' | 'ACTIVE';
}