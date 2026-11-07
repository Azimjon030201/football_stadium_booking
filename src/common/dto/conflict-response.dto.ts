import { ApiProperty } from '@nestjs/swagger';

export class ConflictResponseDto {
  @ApiProperty({ example: 409, description: 'HTTP статусный код' })
  statusCode: number;

  @ApiProperty({
    example: 'Ushbu vaqt uchun maydon allaqachon band qilingan',
    description: 'Xabar tavsifi',
  })
  message: string;

  @ApiProperty({ example: 'Conflict', description: 'Xatolik turi' })
  error: string;
}