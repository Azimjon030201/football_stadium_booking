import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: UserRole;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('register')
  @ApiOperation({ summary: 'Yangi foydalanuvchi ro‘yxatdan o‘tadi' })
  @ApiCreatedResponse({ description: 'Foydalanuvchi muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri ma’lumotlar yoki mavjud email' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('login')
  @ApiOperation({ summary: 'Foydalanuvchi uchun JWT token oladi' })
  @ApiOkResponse({ description: 'Login muvaffaqiyatli bajarildi' })
  @ApiBadRequestResponse({ description: 'Noto‘g‘ri email yoki parol' })
  @ApiUnauthorizedResponse({ description: 'Login ma’lumotlari yaroqsiz' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token orqali yangi access token oladi' })
  @ApiOkResponse({ description: 'Yangi token muvaffaqiyatli yaratildi' })
  @ApiBadRequestResponse({ description: 'Refresh token noto‘g‘ri' })
  @ApiUnauthorizedResponse({ description: 'Token tasdiqdan o‘tdi yoki yaroqsiz' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi profili' })
  @ApiOkResponse({ description: 'Foydalanuvchi ma’lumoti' })
  @ApiUnauthorizedResponse({ description: 'JWT token mavjud emas yoki yaroqsiz' })
  me(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Foydalanuvchi tizimdan chiqadi' })
  @ApiNoContentResponse({ description: 'Tizimdan chiqish muvaffaqiyatli bajarildi' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Parolni o‘zgartirish' })
  @ApiOkResponse({ description: 'Parol muvaffaqiyatli o‘zgartirildi' })
  @ApiBadRequestResponse({ description: 'Yangi parol formati noto‘g‘ri' })
  @ApiUnauthorizedResponse({ description: 'JWT token yaroqsiz' })
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }
}