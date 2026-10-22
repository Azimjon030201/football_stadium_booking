import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { WorkingHourDto } from './dto/working-hour.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { FieldOwnershipGuard } from '../common/guards/field-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: string;
  };
};

@ApiTags('Fields')
@Controller()
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @ApiOperation({ summary: 'Field yaratish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Post('stadiums/:stadiumId/fields')
  create(
    @Param('stadiumId', ParseUUIDPipe) stadiumId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFieldDto,
  ) {
    return this.fieldsService.create(
      stadiumId,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Stadiondagi faol maydonlar ro‘yxati' })
  @Get('stadiums/:stadiumId/fields')
  findByStadium(
    @Param('stadiumId', ParseUUIDPipe) stadiumId: string,
  ) {
    return this.fieldsService.findByStadium(stadiumId);
  }

  @ApiOperation({ summary: 'Maydon haqida ma’lumot' })
  @Get('fields/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldsService.findOne(id);
  }

  @ApiOperation({ summary: 'Maydonni tahrirlash yoki faolligini o‘zgartirish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FieldOwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Patch('fields/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.fieldsService.update(
      id,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Haftaning 7 kuni uchun ish vaqtlarini saqlash' })
  @ApiBearerAuth()
  @ApiBody({
    type: WorkingHourDto,
    isArray: true,
    examples: {
      fullWeek: {
        summary: 'Har kuni 08:00–23:00',
        value: [
          { dayOfWeek: 0, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 1, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '23:00', isClosed: false },
          { dayOfWeek: 6, openTime: '08:00', closeTime: '23:00', isClosed: false },
        ],
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard, FieldOwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Put('fields/:id/working-hours')
  setWorkingHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Body(
      new ParseArrayPipe({
        items: WorkingHourDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    hours: WorkingHourDto[],
  ) {
    return this.fieldsService.setWorkingHours(
      id,
      req.user.userId,
      req.user.role,
      hours,
    );
  }

  @ApiOperation({ summary: 'Maydon ish vaqtlarini ko‘rish' })
  @Get('fields/:id/working-hours')
  getWorkingHours(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldsService.getWorkingHours(id);
  }

  @ApiOperation({ summary: 'Maydonni o‘chirish (soft delete)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, FieldOwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @Delete('fields/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fieldsService.remove(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}