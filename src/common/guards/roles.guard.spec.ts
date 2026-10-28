import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const guard = new RolesGuard(
    reflector as unknown as Reflector,
  );

  const createContext = (user?: { role?: string }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const expectForbidden = (context: ExecutionContext) => {
    let caught: unknown;

    try {
      guard.canActivate(context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ForbiddenException);

    const exception = caught as ForbiddenException;

    expect(exception.getStatus()).toBe(403);
    expect(exception.getResponse()).toMatchObject({
      error: 'FORBIDDEN_RESOURCE',
    });
  };

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it.each([
    UserRole.USER,
    UserRole.OWNER,
    UserRole.ADMIN,
  ])('@Roles belgilanmaganida %s roliga ruxsat beradi', (role) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(
      guard.canActivate(createContext({ role })),
    ).toBe(true);
  });

  it('rollar ro‘yxati bo‘sh bo‘lsa ruxsat beradi', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(
      guard.canActivate(createContext({ role: UserRole.USER })),
    ).toBe(true);
  });

  it('ADMIN admin endpointga kira oladi', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
    ]);

    expect(
      guard.canActivate(createContext({ role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it.each([
    UserRole.USER,
    UserRole.OWNER,
    'SUPERUSER',
    '',
  ])('admin endpointda %s rolini rad etadi', (role) => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
    ]);

    expectForbidden(createContext({ role }));
  });

  it('user mavjud bo‘lmasa himoyalangan endpointni rad etadi', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
    ]);

    expectForbidden(createContext());
  });

  it('user mavjud, lekin role yo‘q bo‘lsa rad etadi', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
    ]);

    expectForbidden(createContext({}));
  });

  it.each([
    UserRole.OWNER,
    UserRole.ADMIN,
  ])('bir nechta ruxsat etilgan roldan %s ni qabul qiladi', (role) => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.OWNER,
      UserRole.ADMIN,
    ]);

    expect(
      guard.canActivate(createContext({ role })),
    ).toBe(true);
  });

  it('OWNER yoki ADMIN talab qilinganda USER ni rad etadi', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.OWNER,
      UserRole.ADMIN,
    ]);

    expectForbidden(createContext({ role: UserRole.USER }));
  });

  describe('haqiqiy Roles dekoratori va Reflector', () => {
    @Roles(UserRole.ADMIN)
    class TestController {
      inherited() {}

      @Roles(UserRole.OWNER)
      ownerOnly() {}
    }

    const realGuard = new RolesGuard(new Reflector());

    const controllerContext = (
      method: 'inherited' | 'ownerOnly',
      role: UserRole,
    ) =>
      ({
        getHandler: () => TestController.prototype[method],
        getClass: () => TestController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { role } }),
        }),
      }) as unknown as ExecutionContext;

    it('controller darajasidagi ADMIN talabini qo‘llaydi', () => {
      expect(
        realGuard.canActivate(
          controllerContext('inherited', UserRole.ADMIN),
        ),
      ).toBe(true);

      expect(() =>
        realGuard.canActivate(
          controllerContext('inherited', UserRole.USER),
        ),
      ).toThrow(ForbiddenException);
    });

    it('metoddagi OWNER talabi controller talabidan ustun turadi', () => {
      expect(
        realGuard.canActivate(
          controllerContext('ownerOnly', UserRole.OWNER),
        ),
      ).toBe(true);

      expect(() =>
        realGuard.canActivate(
          controllerContext('ownerOnly', UserRole.ADMIN),
        ),
      ).toThrow(ForbiddenException);
    });
  });
});