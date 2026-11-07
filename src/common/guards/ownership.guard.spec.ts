import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OwnershipGuard } from './ownership.guard';
import { FieldOwnershipGuard } from './field-ownership.guard';

type TestUser = {
  userId?: string;
  role?: string;
};

function createContext(
  user?: TestUser,
  params: { id?: string; stadiumId?: string } = {
    id: 'resource-1',
  },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

const cases = [
  {
    name: 'OwnershipGuard — stadion',
    kind: 'stadium',
    resource: { ownerId: 'owner-1' },
    notFoundCode: 'STADIUM_NOT_FOUND',
  },
  {
    name: 'FieldOwnershipGuard — maydon',
    kind: 'field',
    resource: {
      stadium: { ownerId: 'owner-1' },
    },
    notFoundCode: 'FIELD_NOT_FOUND',
  },
] as const;

describe.each(cases)('$name', (testCase) => {
  const findFirst = jest.fn();

  const prisma = {
    stadium: { findFirst },
    field: { findFirst },
  } as unknown as PrismaService;

  const guard =
    testCase.kind === 'stadium'
      ? new OwnershipGuard(prisma)
      : new FieldOwnershipGuard(prisma);

  async function expectError(
    context: ExecutionContext,
    status: number,
    code: string,
  ) {
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status,
      response: {
        error: code,
      },
    });
  }

  beforeEach(() => {
    findFirst.mockReset();
    findFirst.mockResolvedValue(testCase.resource);
  });

  it('OWNER o‘z resursini boshqara oladi', async () => {
    await expect(
      guard.canActivate(
        createContext({
          userId: 'owner-1',
          role: 'OWNER',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('boshqa OWNER resursiga kirishni 403 bilan rad etadi', async () => {
    await expectError(
      createContext({
        userId: 'owner-2',
        role: 'OWNER',
      }),
      403,
      'FORBIDDEN_RESOURCE',
    );
  });

  it('ADMIN mavjud resursni boshqara oladi', async () => {
    await expect(
      guard.canActivate(
        createContext({
          userId: 'admin-1',
          role: 'ADMIN',
        }),
      ),
    ).resolves.toBe(true);
  });

  it.each(['USER', 'SUPERUSER', undefined])(
    'egalik mos bo‘lsa ham %s roliga ruxsat bermaydi',
    async (role) => {
      await expectError(
        createContext({
          userId: 'owner-1',
          role,
        }),
        403,
        'FORBIDDEN_RESOURCE',
      );
    },
  );

  it('foydalanuvchi bo‘lmasa 401 qaytaradi', async () => {
    await expectError(
      createContext(),
      401,
      'UNAUTHORIZED',
    );

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('userId bo‘lmasa 401 qaytaradi', async () => {
    await expectError(
      createContext({ role: 'OWNER' }),
      401,
      'UNAUTHORIZED',
    );

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('resurs ID si bo‘lmasa 400 qaytaradi', async () => {
    await expectError(
      createContext(
        { userId: 'owner-1', role: 'OWNER' },
        {},
      ),
      400,
      'VALIDATION_ERROR',
    );

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('resurs topilmasa 404 qaytaradi', async () => {
    findFirst.mockResolvedValue(null);

    await expectError(
      createContext({
        userId: 'owner-1',
        role: 'OWNER',
      }),
      404,
      testCase.notFoundCode,
    );
  });

  it('ADMIN uchun ham yo‘q resursga 404 qaytaradi', async () => {
    findFirst.mockResolvedValue(null);

    await expectError(
      createContext({
        userId: 'admin-1',
        role: 'ADMIN',
      }),
      404,
      testCase.notFoundCode,
    );
  });

  it('bazadan faqat o‘chirilmagan resursni qidiradi', async () => {
    await guard.canActivate(
      createContext({
        userId: 'owner-1',
        role: 'OWNER',
      }),
    );

    if (testCase.kind === 'stadium') {
      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: 'resource-1',
          deletedAt: null,
        },
        select: {
          ownerId: true,
        },
      });
    } else {
      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: 'resource-1',
          deletedAt: null,
          stadium: {
            is: { deletedAt: null },
          },
        },
        select: {
          stadium: {
            select: { ownerId: true },
          },
        },
      });
    }
  });

  if (testCase.kind === 'stadium') {
    it('ichki route uchun stadiumId parametrini ishlatadi', async () => {
      await guard.canActivate(
        createContext(
          { userId: 'owner-1', role: 'OWNER' },
          {
            id: 'field-1',
            stadiumId: 'stadium-1',
          },
        ),
      );

      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: 'stadium-1',
          deletedAt: null,
        },
        select: {
          ownerId: true,
        },
      });
    });
  }
});