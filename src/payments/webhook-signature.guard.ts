import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { MockProvider } from './providers/mock-provider';

// HMAC tekshiruvi servisdan alohida (servis testlari 2 argument bilan chaqiradi).
// main.ts: NestFactory.create(AppModule, { rawBody: true })
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly mock: MockProvider) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // Noma'lum providerni servis o'zi 400 bilan rad etadi
    if (String(req.params?.provider).toUpperCase() !== 'MOCK') return true;

    const ok = this.mock.verifySignature(req.rawBody, req.headers['x-signature']);
    if (!ok) {
      throw new ForbiddenException({
        error: 'FORBIDDEN_RESOURCE',
        message: 'Invalid webhook signature.',
      });
    }
    return true;
  }
}