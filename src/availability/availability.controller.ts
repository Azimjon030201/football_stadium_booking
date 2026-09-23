import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

@ApiTags('Availability')
@Controller('fields')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @ApiOperation({ summary: "Field uchun bo'sh/band slotlar" })
  @Get(':id/availability')
  getAvailability(@Param('id') fieldId: string, @Query('date') date: string) {
    return this.availabilityService.getAvailability(fieldId, date);
  }
}
