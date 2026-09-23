import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Ishlatilishi: async getMe(@CurrentUser() user) { ... }
// req.user o'rniga qulay yozish uchun.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
