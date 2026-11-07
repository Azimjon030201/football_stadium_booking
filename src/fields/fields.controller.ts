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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse
} from '@nestjs/swagger';
import { Request } from 'express';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: string;
  };
};

// Batafsil: Dev4 qo'llanma (6-BOB), TASK-01 dan TASK-11 gacha
@ApiTags('Fields')
@Controller()
export class FieldsController {
  constructor(private fieldsService: FieldsService) {}

  @ApiOperation({ summary: 'Field yaratish' })
  @ApiCreatedResponse({ description: 'Field muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri ma’lumotlar' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Ushbu stadioni boshqarishga ruxsat yo‘q' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('stadiums/:stadiumId/fields')
  create(@Param('stadiumId') stadiumId: string, @Req() req: AuthenticatedRequest, @Body() dto: CreateFieldDto) {
    return this.fieldsService.create(stadiumId, req.user.userId, req.user.role, dto);
  }

  @ApiOperation({ summary: "Stadiondagi field'lar ro'yxati" })
  @ApiOkResponse({ description: 'Fieldlar ro‘yxati muvaffaqiyatli olindi' })
  @Get('stadiums/:stadiumId/fields')
  findByStadium(@Param('stadiumId') stadiumId: string) {
    return this.fieldsService.findByStadium(stadiumId);
  }

  @ApiOperation({ summary: 'Field detali' })
  @ApiOkResponse({ description: 'Field ma’lumoti muvaffaqiyatli olindi' })
  @ApiNotFoundResponse({ description: 'Field topilmadi' })
  @Get('fields/:id')
  findOne(@Param('id') id: string) {
    return this.fieldsService.findOne(id);
  }

  @ApiOperation({ summary: "Field'ni tahrirlash / isActive o'zgartirish" })
  @ApiOkResponse({ description: 'Field muvaffaqiyatli yangilandi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri ma’lumotlar' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Fieldni yangilashga ruxsat yo‘q' })
  @ApiNotFoundResponse({ description: 'Field topilmadi' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('fields/:id')
  update(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: UpdateFieldDto) {
    return this.fieldsService.update(id, req.user.userId, req.user.role, dto);
  }

  @ApiOperation({ summary: 'Ish vaqtlarini o\'rnatish (7 kunlik massiv)' })
  @ApiOkResponse({ description: 'Ish vaqtlari muvaffaqiyatli saqlandi' })
  @ApiBadRequestResponse({ description: 'Vaqt formati noto‘g‘ri' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Ish vaqtlarini o‘rnatishga ruxsat yo‘q' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('fields/:id/working-hours')
  setWorkingHours(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() hours: WorkingHourDto[]) {
    return this.fieldsService.setWorkingHours(id, req.user.userId, req.user.role, hours);
  }

  @ApiOperation({ summary: 'Ish vaqtlarini ko\'rish' })
  @ApiOkResponse({ description: 'Ish vaqtlari muvaffaqiyatli olindi' })
  @ApiNotFoundResponse({ description: 'Field topilmadi' })
  @Get('fields/:id/working-hours')
  getWorkingHours(@Param('id') id: string) {
    return this.fieldsService.getWorkingHours(id);
  }

  @ApiOperation({ summary: "Field'ni o'chirish (soft delete)" })
  @ApiOkResponse({ description: 'Field muvaffaqiyatli o‘chirildi (soft delete)' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Fieldni o‘chirishga ruxsat yo‘q' })
  @ApiNotFoundResponse({ description: 'Field topilmadi' })
  @ApiConflictResponse({ description:'Faol bronlar bor fieldni ochirish mumkin emas' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('fields/:id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fieldsService.remove(id, req.user.userId, req.user.role);
  }
}
