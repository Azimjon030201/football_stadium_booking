import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function ctx(user: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;
  beforeEach(() => { reflector = new Reflector(); guard = new RolesGuard(reflector); });

  it('@Roles yo\'q bo\'lsa ruxsat beradi', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: 'USER' }))).toBe(true);
  });
  it('ADMIN ruxsat oladi', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(guard.canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
  });
  it('USER ADMIN endpointga kira olmaydi', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx({ role: 'USER' }))).toThrow(ForbiddenException);
  });
  it('user yo\'q bo\'lsa 403', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
