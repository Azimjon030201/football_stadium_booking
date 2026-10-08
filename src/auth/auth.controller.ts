import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  async logout() {
    return;
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
  @Post('change-password')
@UseGuards(JwtAuthGuard)
async changePassword(
  @Req() req,
  @Body() dto: ChangePasswordDto,
) {
  return this.authService.changePassword(
    req.user.userId,
    dto,
  );
}
}