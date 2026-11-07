import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking working hours (e2e)', () => {
  const getTomorrowDateString = (hours: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return `${dateStr}T${hours}.000Z`;
  };

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
        email: `owner-working-hours-${randomUUID()}@example.com`,
        passwordHash: 'seeded-owner-hash',
        firstName: 'Owner',
        lastName: 'WorkingHours',
        role: 'OWNER',
        isOwnerVerified: true,
        status: 'ACTIVE',
      },
    });

    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner.id,
        name: 'Working Hours Arena',
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
        name: 'Working Hours Field',
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

  const createUserAndToken = async () => {
    const email = `user-working-hours-${randomUUID()}@example.com`;
    const password = 'StrongPass1!';

    const register = await http.post('/api/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      phone: `+998${Math.floor(100000000 + Math.random() * 900000000)}`,
    });

    expect(register.status).toBe(201);

    const login = await http.post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(201);

    return login.body.accessToken as string;
  };

  it('bron 03:00 Toshkent (UTC 22:00 oldin) da bo‘lsa BOOKING_OUTSIDE_WORKING_HOURS bilan 400 qaytaradi', async () => {
    const token = await createUserAndToken();

const startTime = getTomorrowDateString('03:00:00');
const endTime = getTomorrowDateString('04:00:00');

    const res = await http
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ fieldId, startTime, endTime });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tanlangan vaqt maydonning ish vaqtidan tashqarida');
  });

  it('bron 10:00-11:00 Toshkent bo‘lsa 201 qaytaradi', async () => {
    const token = await createUserAndToken();

    const res = await http
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime: getTomorrowDateString('10:00:00'),
        endTime: getTomorrowDateString('11:00:00')
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('bron 22:30-23:30 Toshkent bo‘lsa 400 qaytaradi', async () => {
    const token = await createUserAndToken();

    const res = await http
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime:getTomorrowDateString('17:30:00'),
        endTime: getTomorrowDateString('18:30:00')
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BOOKING_OUTSIDE_WORKING_HOURS');
  });

  it('specialWorkingDay da isClosed bo‘lsa 400 qaytaradi', async () => {
    const token = await createUserAndToken();

    await prisma.specialWorkingDay.create({
      data: {
        fieldId,
        date: (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        })(),
        isClosed: true,
      },
    });

    const res = await http
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime:getTomorrowDateString('22:00:00') ,
        endTime: getTomorrowDateString('23:00:00'),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BOOKING_OUTSIDE_WORKING_HOURS');
  });
});
