import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkingHourDto } from './dto/working-hour.dto';
import { SearchStadiumDto } from './dto/search-stadium.dto';
import { FieldsService } from './fields.service';

const mockAsync = <TArgs extends unknown[], TResult>(value: TResult) =>
  jest
    .fn<(...args: TArgs) => Promise<TResult>>()
    .mockResolvedValue(value);

describe('FieldsService', () => {
  type AsyncMock<TArgs extends unknown[], TResult> = jest.Mock<
    (...args: TArgs) => Promise<TResult>
  >;

  let service: FieldsService;
  let prisma: {
    field: {
      findUnique: AsyncMock<
        [Prisma.FieldFindUniqueArgs],
        { deletedAt: Date | null; stadium: { ownerId: string } } | null
      >;
    };
    workingHour: {
      upsert: AsyncMock<[Prisma.WorkingHourUpsertArgs], { id: string }>;
    };
    stadium: {
      findMany: AsyncMock<[Prisma.StadiumFindManyArgs], unknown[]>;
      count: AsyncMock<[Prisma.StadiumCountArgs], number>;
    };
    $transaction: AsyncMock<unknown[], unknown[]>;
  };

  beforeEach(() => {
    prisma = {
      field: {
        findUnique: mockAsync<
          [Prisma.FieldFindUniqueArgs],
          { deletedAt: Date | null; stadium: { ownerId: string } } | null
        >({
          deletedAt: null,
          stadium: { ownerId: 'owner-1' },
        }),
      },
      workingHour: {
        upsert: mockAsync<[Prisma.WorkingHourUpsertArgs], { id: string }>({
          id: 'working-hour-1',
        }),
      },
      stadium: {
        findMany: mockAsync<[Prisma.StadiumFindManyArgs], unknown[]>([]),
        count: mockAsync<[Prisma.StadiumCountArgs], number>(0),
      },
      $transaction: mockAsync<unknown[], unknown[]>([]),
    };
    service = new FieldsService(prisma as unknown as PrismaService);
  });

  describe('setWorkingHours', () => {
    const saveHours = (hours: WorkingHourDto[]) =>
      service.setWorkingHours('field-1', 'owner-1', 'OWNER', hours);

    it('rejects open days without both times before writing', async () => {
      await expect(
        saveHours([{ dayOfWeek: 1, isClosed: false, openTime: '08:00' }]),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.workingHour.upsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects invalid time order and duplicate days before writing', async () => {
      await expect(
        saveHours([
          { dayOfWeek: 1, isClosed: false, openTime: '18:00', closeTime: '08:00' },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        saveHours([
          { dayOfWeek: 1, isClosed: true },
          { dayOfWeek: 1, isClosed: true },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.workingHour.upsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('upserts a partial week transactionally and clears times on closed days', async () => {
      const hours: WorkingHourDto[] = [
        { dayOfWeek: 0, isClosed: false, openTime: '08:00', closeTime: '22:00' },
        { dayOfWeek: 1, isClosed: true },
      ];

      await saveHours(hours);

      expect(prisma.workingHour.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.workingHour.upsert).toHaveBeenLastCalledWith({
        where: { fieldId_dayOfWeek: { fieldId: 'field-1', dayOfWeek: 1 } },
        update: { openTime: null, closeTime: null, isClosed: true },
        create: {
          fieldId: 'field-1',
          dayOfWeek: 1,
          openTime: null,
          closeTime: null,
          isClosed: true,
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchStadiums', () => {
    it('applies safe filters and caps pagination at 100', async () => {
      const query: SearchStadiumDto = {
        search: "' OR '1'='1",
        minPrice: 100,
        maxPrice: 200,
        fieldType: undefined,
        capacity: 8,
        minRating: 3.5,
        page: 2,
        limit: 500,
      };

      const result = await service.searchStadiums(query);

      const where = prisma.stadium.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('ACTIVE');
      expect(where.deletedAt).toBeNull();
      expect(where.AND).toEqual(
        expect.arrayContaining([
          {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          },
          { fields: { some: { deletedAt: null } } },
          { fields: { none: { deletedAt: null, pricePerHour: { lt: 100 } } } },
          { fields: { some: { deletedAt: null, pricePerHour: { lte: 200 } } } },
          { fields: { some: { deletedAt: null, capacity: { gte: 8 } } } },
          { averageRating: { gte: 3.5 } },
        ]),
      );
      expect(prisma.stadium.count).toHaveBeenCalledWith({ where });
      expect(result.meta).toEqual({
        page: 2,
        limit: 100,
        total: 0,
        totalPages: 0,
      });
    });

    it('rejects an inverted price range', async () => {
      await expect(
        service.searchStadiums({
          minPrice: 200,
          maxPrice: 100,
        } as SearchStadiumDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.stadium.findMany).not.toHaveBeenCalled();
    });
  });
});
