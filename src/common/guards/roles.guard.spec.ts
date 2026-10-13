import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const requiredRoles = ['ADMIN'];
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const createContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it('allows requests when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);

    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('rejects a user without a required role with 403', () => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);

    expect(() => guard.canActivate(createContext('USER'))).toThrow(
      new ForbiddenException({ error: 'FORBIDDEN_RESOURCE' }),
    );
  });
});
