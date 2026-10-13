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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { QueryStadiumsDto } from './dto/query-stadiums.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@ApiTags('Stadiums')
@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly stadiumsService: StadiumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi stadion yaratish' })
  create(@Body() createStadiumDto: CreateStadiumDto, @Req() req: any) {
    return this.stadiumsService.create(createStadiumDto, req.user.userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionlar ro\'yxatini olish (pagination bilan)' })
  findAll(@Query() query: QueryStadiumsDto, @Req() req: any) {
    return this.stadiumsService.findAll(query, req.user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni ID bo\'yicha olish' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni yangilash' })
  update(
    @Param('id') id: string,
    @Body() updateStadiumDto: UpdateStadiumDto,
    @Req() req: any,
  ) {
    return this.stadiumsService.update(id, updateStadiumDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni o\'chirish (Soft delete)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.remove(id, req.user);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stadionni aktivlashtirishga yuborish' })
  submit(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.submit(id, req.user.userId);
  }
}