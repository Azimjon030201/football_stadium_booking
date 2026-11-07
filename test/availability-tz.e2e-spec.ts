import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Availability timezone (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: any;
  let fieldId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    const owner = await prisma.user.create({
      data: {
        email: `owner-availability-tz-${randomUUID()}@example.com`,
        passwordHash: 'seeded-owner-hash',
        firstName: 'Owner',
        lastName: 'Availability',
        role: 'OWNER',
        isOwnerVerified: true,
        status: 'ACTIVE',
      },
    });

    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner.id,
        name: 'Availability TZ Arena',
        address: 'Tashkent, Uzbekistan',
        latitude: 41.2995,
        longitude: 69.2401,
        phone: '+998901234567',
        status: 'ACTIVE',
      },
    });

    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id,
        name: 'Availability TZ Field',
        fieldType: 'ARTIFICIAL_GRASS',
        capacity: 8,
        size: '30x40',
        pricePerHour: 150000,
        isActive: true,
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            openTime: '09:00',
            closeTime: '23:00',
            isClosed: false,
          })),
        },
      },
    });

    fieldId = field.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /fields/:id/availability uchun birinchi slot Toshkent 09:00 = UTC 04:00 bo‘lishi kerak', async () => {
    const res = await http.get(`/api/fields/${fieldId}/availability?date=2026-10-27`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots[0].start).toBe('2026-10-27T04:00:00.000Z');
    expect(res.body.slots[0].end).toBe('2026-10-27T05:00:00.000Z');
  });

  it('date formati noto‘g‘ri bo‘lsa 400 qaytaradi', async () => {
    const res = await http.get(`/api/fields/${fieldId}/availability?date=2026/10/27`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('date YYYY-MM-DD');
  });
});
