import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SetWorkingHoursDto } from './dto/working-hour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Fields & Search (Dev4)')
@Controller()
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get('stadiums/:stadiumId/fields')
  @ApiOperation({ summary: 'Stadiondagi barcha maydonlarni olish (Public)' })
  async getStadiumFields(@Param('stadiumId') stadiumId: string) {
    return this.fieldsService.findByStadium(stadiumId);
  }

  @Post('stadiums/:stadiumId/fields')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadion ichiga yangi maydon qo\'shish (Owner/Admin)' })
  async createField(
    @Param('stadiumId') stadiumId: string,
    @Req() req: any,
    @Body() dto: CreateFieldDto,
  ) {
    return this.fieldsService.createField(stadiumId, req.user.id, req.user.role, dto);
  }

  @Get('fields/:id')
  @ApiOperation({ summary: 'Bitta maydon haqida to\'liq ma\'lumot (Public)' })
  async getField(@Param('id') id: string) {
    return this.fieldsService.findOne(id);
  }

  @Patch('fields/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Maydon ma\'lumotlarini tahrirlash (Owner/Admin)' })
  async updateField(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.fieldsService.updateField(id, req.user.id, req.user.role, dto);
  }

  @Put('fields/:id/working-hours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Maydonning ish vaqtlarini o\'rnatish (Owner/Admin)' })
  async setWorkingHours(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: SetWorkingHoursDto,
  ) {
    return this.fieldsService.setWorkingHours(id, req.user.id, req.user.role, dto.hours);
  }

  @Delete('fields/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Maydonni soft-delete qilish (Owner/Admin)' })
  async removeField(@Param('id') id: string, @Req() req: any) {
    return this.fieldsService.removeField(id, req.user.id, req.user.role);
  }
}