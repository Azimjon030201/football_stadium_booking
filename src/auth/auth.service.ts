import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException({
        error: 'USER_ALREADY_EXISTS',
        message: "Bu email allaqachon ro'yxatdan o'tgan",
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const { passwordHash: _, ...result } = user;

    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email.toLowerCase(),
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException({
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: 'AUTH_TOKEN_EXPIRED',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: stored.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    return {
      accessToken,
    };
  }
}