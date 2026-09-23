import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Batafsil: Dev2 qo'llanma (6-BOB), TASK-01 dan TASK-13 gacha
@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOperation({ summary: "O'z profilini ko'rish" })
  @UseGuards(JwtAuthGuard)
  @Get('users/me')
  getMe(@Req() req) {
    return this.usersService.getMe(req.user.userId);
  }

  @ApiOperation({ summary: "O'z profilini tahrirlash" })
  @UseGuards(JwtAuthGuard)
  @Patch('users/me')
  updateMe(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Barcha foydalanuvchilar (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/users')
  findAllForAdmin(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAllForAdmin(page, limit);
  }

  @ApiOperation({ summary: 'Foydalanuvchini block/unblock qilish (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/users/:id/block')
  setStatus(@Param('id') id: string, @Body('status') status: 'BLOCKED' | 'ACTIVE') {
    return this.usersService.setStatus(id, status);
  }
}
