import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('Availability')
@Controller('fields')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @ApiOperation({ summary: "Field uchun bo'sh/band slotlar" })
  @ApiResponse({ status: 200, description: 'Availability ma’lumotlari muvaffaqiyatli qaytarildi' })
  @ApiResponse({ status: 400, description: 'Noto‘g‘ri date formati' })
  @ApiResponse({ status: 404, description: 'Field topilmadi' })
  @Get(':id/availability')
  getAvailability(@Param('id') fieldId: string, @Query('date') date: string) {
    return this.availabilityService.getAvailability(fieldId, date);
  }
}
