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
import { Request } from 'express';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Stadiums')
@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly stadiumsService: StadiumsService) {}

  @ApiOperation({ summary: 'Stadion yaratish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateStadiumDto) {
    return this.stadiumsService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: "Stadionlar ro'yxati (qidiruv/filtr)" })
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('fieldType') fieldType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.stadiumsService.findAll({
      search,
      minPrice,
      maxPrice,
      fieldType,
      page,
      limit,
    });
  }

  @ApiOperation({ summary: 'Stadion detali' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Stadionni tahrirlash' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateStadiumDto,
  ) {
    return this.stadiumsService.update(
      id,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @ApiOperation({ summary: 'Moderatsiyaga yuborish' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  submit(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.submit(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Stadionni arxivlash (soft delete)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  archive(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.archive(id, req.user.userId, req.user.role);
  }

  @ApiOperation({ summary: 'Moderatsiya navbati (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  findAllForAdmin(@Query('status') status?: string) {
    return this.stadiumsService.findAllForAdmin(status);
  }

  @ApiOperation({ summary: 'Stadionni tasdiqlash (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id/approve')
  approve(@Param('id') id: string) {
    return this.stadiumsService.approve(id);
  }
}