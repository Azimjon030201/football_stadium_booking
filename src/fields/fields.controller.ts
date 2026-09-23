import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// Batafsil: Dev4 qo'llanma (6-BOB), TASK-01 dan TASK-11 gacha
@ApiTags('Fields')
@Controller()
export class FieldsController {
  constructor(private fieldsService: FieldsService) {}

  @ApiOperation({ summary: 'Field yaratish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('stadiums/:stadiumId/fields')
  create(@Param('stadiumId') stadiumId: string, @Req() req, @Body() dto: CreateFieldDto) {
    return this.fieldsService.create(stadiumId, req.user.userId, req.user.role, dto);
  }

  @ApiOperation({ summary: "Stadiondagi field'lar ro'yxati" })
  @Get('stadiums/:stadiumId/fields')
  findByStadium(@Param('stadiumId') stadiumId: string) {
    return this.fieldsService.findByStadium(stadiumId);
  }

  @ApiOperation({ summary: 'Field detali' })
  @Get('fields/:id')
  findOne(@Param('id') id: string) {
    return this.fieldsService.findOne(id);
  }

  @ApiOperation({ summary: "Field'ni tahrirlash / isActive o'zgartirish" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('fields/:id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateFieldDto) {
    return this.fieldsService.update(id, req.user.userId, req.user.role, dto);
  }

  @ApiOperation({ summary: 'Ish vaqtlarini o\'rnatish (7 kunlik massiv)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('fields/:id/working-hours')
  setWorkingHours(@Param('id') id: string, @Req() req, @Body() hours: WorkingHourDto[]) {
    return this.fieldsService.setWorkingHours(id, req.user.userId, req.user.role, hours);
  }

  @ApiOperation({ summary: 'Ish vaqtlarini ko\'rish' })
  @Get('fields/:id/working-hours')
  getWorkingHours(@Param('id') id: string) {
    return this.fieldsService.getWorkingHours(id);
  }

  @ApiOperation({ summary: "Field'ni o'chirish (soft delete)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('fields/:id')
  remove(@Param('id') id: string, @Req() req) {
    return this.fieldsService.remove(id, req.user.userId, req.user.role);
  }
}
