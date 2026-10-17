import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization?: string;
      };
      user?: {
        userId?: string;
        role?: string;
      };
    }>();

    // Token yuborilmasa, mehmon sifatida kiradi.
    if (request.headers.authorization === undefined) {
      request.user = undefined;
      return true;
    }

    // Token yuborilsa, JwtAuthGuard to'liq tekshiradi.
    return super.canActivate(context);
  }
}