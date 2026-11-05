import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Reflector } from '@nestjs/core'

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  constructor(prisma: PrismaService,
    private reflector: Reflector)
   {
    super(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(), 
    ])
    if(isPublic) {
      return true;
    }

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