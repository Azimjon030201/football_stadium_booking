import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  ParseEnumPipe,
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
} from '@nestjs/swagger';
import { Request } from 'express';
import { StadiumStatus } from '@prisma/client';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { QueryStadiumsDto } from './dto/query-stadiums.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: string;
  };
};

@ApiTags('Stadiums')
@Controller('stadiums')
export class StadiumsController {
  constructor(
    private readonly stadiumsService: StadiumsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi stadion yaratish' })
  @ApiCreatedResponse({ description: 'Stadion muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri ma’lumotlar' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  create(
    @Body() dto: CreateStadiumDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Stadionlar ro'yxatini olish (pagination)",
  })
  @ApiOkResponse({ description: 'Stadionlar ro‘yxati muvaffaqiyatli olindi' })
  findAll(
    @Query() query: QueryStadiumsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.findAll(query, req.user);
  }

  @Get('admin/stadiums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: stadionlar moderatsiyasi' })
  @ApiOkResponse({ description: 'Admin uchun stadionlar ro‘yxati' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Admin ruxsati yo‘q' })
  getAdminStadiums(
    @Query('status', new ParseEnumPipe(StadiumStatus, { optional: true }))
    status?: StadiumStatus,
  ) {
    return this.stadiumsService.getAdminStadiums(status);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Stadionni ID bo'yicha olish" })
  @ApiOkResponse({ description: 'Stadion ma’lumoti muvaffaqiyatli olindi' })
  @ApiNotFoundResponse({ description: 'Stadion topilmadi' })
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni yangilash' })
  @ApiOkResponse({ description: 'Stadion muvaffaqiyatli yangilandi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri ma’lumotlar' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Bu stadionni yangilashga ruxsat yo‘q' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStadiumDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.update(id, dto, req.user);
  }

  @Patch('admin/stadiums/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: stadionni tasdiqlash' })
  @ApiOkResponse({ description: 'Stadion tasdiqlandi' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Admin ruxsati yo‘q' })
  approve(@Param('id') id: string) {
    return this.stadiumsService.approve(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni arxivlash (Soft delete)' })
  @ApiOkResponse({ description: 'Stadion muvaffaqiyatli arxivlandi' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Ushbu stadionni arxivlashga ruxsat yo‘q' })
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.archive(id, req.user);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni moderatsiyaga yuborish' })
  @ApiOkResponse({ description: 'Stadion moderatsiyaga muvaffaqiyatli yuborildi' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  @ApiNotFoundResponse({ description: 'Stadion topilmadi' })
  submit(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stadiumsService.submit(id, req.user.userId);
  }
}