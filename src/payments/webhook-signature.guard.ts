import { CanActivate, ExecutionContext, ForbiddenException, Injectable, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * HMAC-SHA256 imzo tekshiruvi. Header: x-signature = hex(hmac(secret, rawBody)).
 * main.ts da: NestFactory.create(AppModule, { rawBody: true })
 * Dev muhitida mock provayder uchun imzo talab qilinmaydi (Postman'da qulay).
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const isProd = this.config.get('NODE_ENV') === 'production';
    if (!isProd && req.params.provider === 'mock') return true;

    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    const signature = req.header('x-signature');
    if (!secret || !signature || !req.rawBody) throw new ForbiddenException({ error: 'INVALID_SIGNATURE' });

    const expected = createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException({ error: 'INVALID_SIGNATURE' });
    return true;
  }
}
