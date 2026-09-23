import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Batafsil: Dev3 qo'llanma (6-BOB), TASK-01 dan TASK-12 gacha
@ApiTags('Stadiums')
@Controller()
export class StadiumsController {
  constructor(private stadiumsService: StadiumsService) {}

  @ApiOperation({ summary: 'Stadion yaratish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('stadiums')
  create(@Req() req, @Body() dto: CreateStadiumDto) {
    return this.stadiumsService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Stadionlar ro'yxati (qidiruv/filtr)" })
  @Get('stadiums')
  findAll(
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('fieldType') fieldType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.stadiumsService.findAll({ search, minPrice, maxPrice, fieldType, page, limit });
  }

  @ApiOperation({ summary: 'Stadion detali' })
  @Get('stadiums/:id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.stadiumsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Stadionni tahrirlash' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('stadiums/:id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateStadiumDto) {
    return this.stadiumsService.update(id, req.user.userId, req.user.role, dto);
  }

  @ApiOperation({ summary: 'Moderatsiyaga yuborish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('stadiums/:id/submit')
  submit(@Param('id') id: string, @Req() req) {
    return this.stadiumsService.submit(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Stadionni arxivlash (soft delete)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('stadiums/:id')
  archive(@Param('id') id: string, @Req() req) {
    return this.stadiumsService.archive(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Moderatsiya navbati (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/stadiums')
  findAllForAdmin(@Query('status') status?: string) {
    return this.stadiumsService.findAllForAdmin(status);
  }

  @ApiOperation({ summary: 'Stadionni tasdiqlash (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/stadiums/:id/approve')
  approve(@Param('id') id: string) {
    return this.stadiumsService.approve(id);
  }
}
