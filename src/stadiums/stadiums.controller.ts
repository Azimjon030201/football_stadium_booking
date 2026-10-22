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
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
  create(
    @Body() dto: CreateStadiumDto,
    @Req() req: any,
  ) {
    return this.stadiumsService.create(
      dto,
      req.user.userId,
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Stadionlar ro'yxatini olish (pagination)",
  })
  findAll(
    @Query() query: QueryStadiumsDto,
    @Req() req: any,
  ) {
    return this.stadiumsService.findAll(
      query,
      req.user,
    );
  }

  @Get('admin/stadiums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: stadionlar moderatsiyasi',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StadiumStatus,
    description: 'Stadion holati bo‘yicha filtrlash',
  })
  getAdminStadiums(
    @Query(
      'status',
      new ParseEnumPipe(StadiumStatus, {
        optional: true,
      }),
    )
    status?: StadiumStatus,
  ) {
    return this.stadiumsService.getAdminStadiums(status);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Stadionni ID bo'yicha olish",
  })
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.stadiumsService.findOne(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
  )
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stadionni yangilash',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStadiumDto,
    @Req() req: any,
  ) {
    return this.stadiumsService.update(
      id,
      dto,
      req.user,
    );
  }

  @Patch('admin/stadiums/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: stadionni tasdiqlash',
  })
  approve(@Param('id') id: string) {
    return this.stadiumsService.approve(id);
  }

  @Delete(':id')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
  )
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stadionni arxivlash (Soft delete)',
  })
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.stadiumsService.archive(
      id,
      req.user,
    );
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stadionni moderatsiyaga yuborish',
  })
  submit(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.stadiumsService.submit(
      id,
      req.user.userId,
    );
  }
}