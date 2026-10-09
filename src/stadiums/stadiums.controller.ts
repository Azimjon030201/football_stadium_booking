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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto } from './dto/create-stadium.dto';
import { UpdateStadiumDto } from './dto/update-stadium.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 

@ApiTags('Stadiums')
@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly stadiumsService: StadiumsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новый стадион (со статусом DRAFT)' })
  create(@Body() createStadiumDto: CreateStadiumDto, @Req() req: any) {
    return this.stadiumsService.create(createStadiumDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список стадионов' })
  findAll(@Req() req: any) {
    return this.stadiumsService.findAll(req?.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить стадион по ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.findOne(id, req?.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить данные стадиона' })
  update(
    @Param('id') id: string,
    @Body() updateStadiumDto: UpdateStadiumDto,
    @Req() req: any,
  ) {
    return this.stadiumsService.update(id, updateStadiumDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить стадион (Soft delete)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.remove(id, req.user.userId);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить стадион на активацию (DRAFT -> ACTIVE)' })
  @ApiResponse({ status: 200, description: 'Стадион успешно активирован' })
  @ApiResponse({ status: 403, description: 'Нет доступа (не владелец)' })
  @ApiResponse({ status: 404, description: 'Стадион не найден' })
  @ApiResponse({ status: 409, description: 'Стадион находится не в статусе DRAFT' })
  submit(@Param('id') id: string, @Req() req: any) {
    return this.stadiumsService.submit(id, req.user.userId);
  }
}