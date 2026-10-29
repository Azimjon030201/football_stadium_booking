import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: string;
  };
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "O'z profilini ko'rish" })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Foydalanuvchi profili' })
  @ApiResponse({ status: 401, description: 'Token yo‘q yoki yaroqsiz' })
  @Get('users/me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.user.userId);
  }

  @ApiOperation({ summary: "O'z profilini tahrirlash" })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Profil yangilandi' })
  @ApiResponse({ status: 400, description: 'Noto‘g‘ri ma’lumotlar' })
  @ApiResponse({ status: 401, description: 'Token yo‘q yoki yaroqsiz' })
  @Patch('users/me')
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Barcha foydalanuvchilar (Admin)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiResponse({ status: 200, description: 'Foydalanuvchilar ro‘yxati' })
  @ApiResponse({ status: 400, description: 'Pagination parametrlari noto‘g‘ri' })
  @ApiResponse({ status: 401, description: 'Token yo‘q yoki yaroqsiz' })
  @ApiResponse({ status: 403, description: 'Admin ruxsati talab qilinadi' })
  @Get('admin/users')
  findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAllForAdmin(
      page === undefined ? 1 : Number(page),
      limit === undefined ? 20 : Number(limit),
    );
  }

  @ApiOperation({
    summary: 'Foydalanuvchini bloklash yoki blokdan chiqarish',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiResponse({ status: 200, description: 'Foydalanuvchi holati yangilandi' })
  @ApiResponse({ status: 400, description: 'ID yoki status noto‘g‘ri' })
  @ApiResponse({ status: 401, description: 'Token yo‘q yoki yaroqsiz' })
  @ApiResponse({
    status: 403,
    description: 'Ruxsat yo‘q yoki admin o‘zini bloklayapti',
  })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @Patch('admin/users/:id/block')
  setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.setStatus(id, dto.status);
  }
}