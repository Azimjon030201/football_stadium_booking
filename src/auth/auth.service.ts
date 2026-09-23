import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Batafsil: Dev1 qo'llanma, 6-BOB. Har metod — bitta TASK'ga mos.
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // TASK-01: POST /auth/register
  // - email/telefon bandligini tekshirish (409 USER_ALREADY_EXISTS)
  // - bcrypt bilan parolni hash qilish (saltRounds=12)
  // - passwordHash javobda bo'lmasligi kerak
  async register(dto: RegisterDto) {
    throw new Error('TODO (Dev1 TASK-01): register() implement qilinmagan');
  }

  // TASK-03: POST /auth/login
  // - bcrypt.compare bilan parolni tekshirish
  // - xato holatda 401 AUTH_INVALID_CREDENTIALS (email topilmadi va parol
  //   xato uchun BIR XIL xato qaytariladi)
  async login(dto: LoginDto) {
    throw new Error('TODO (Dev1 TASK-03): login() implement qilinmagan');
  }

  // TASK-06: POST /auth/logout — refresh tokenni revoke qilish
  async logout(refreshToken: string) {
    throw new Error('TODO (Dev1 TASK-06): logout() implement qilinmagan');
  }

  // TASK-08, TASK-09: refresh token generatsiya va POST /auth/refresh
  async refresh(refreshToken: string) {
    throw new Error('TODO (Dev1 TASK-08/09): refresh() implement qilinmagan');
  }

  // TASK-10: POST /auth/change-password
  async changePassword(userId: string, dto: ChangePasswordDto) {
    throw new Error('TODO (Dev1 TASK-10): changePassword() implement qilinmagan');
  }
}
