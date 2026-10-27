import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking Conflict (concurrent)', () => {
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
        email: `owner-${randomUUID()}@example.com`,
        passwordHash: 'seeded-owner-hash',
        firstName: 'Owner',
        lastName: 'Conflict',
        role: 'OWNER',
        isOwnerVerified: true,
        status: 'ACTIVE',
      },
    });

    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner.id,
        name: 'Conflict Arena',
        address: 'Conflict str. 1',
        latitude: 41.2995,
        longitude: 69.2401,
        phone: '+998901234567',
        status: 'ACTIVE',
      },
    });

    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id,
        name: 'Pitch Test',
        fieldType: 'ARTIFICIAL_GRASS',
        capacity: 8,
        size: '30x40',
        pricePerHour: 150000,
        isActive: true,
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            openTime: '08:00',
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

  it('bir xil field va bir xil vaqt uchun ikkita parallel booking so\'rovidan faqat bittasi muvaffaqiyatli bo\'lishi kerak', async () => {
    const emailA = `booking-user-a-${randomUUID()}@example.com`;
    const emailB = `booking-user-b-${randomUUID()}@example.com`;
    const password = 'StrongPass1!';

    const userA = await http.post('/api/auth/register').send({
      email: emailA,
      password,
      firstName: 'Alice',
      lastName: 'Test',
      phone: `+99890${Math.floor(1000000 + Math.random() * 9000000)}`,
    });

    const userB = await http.post('/api/auth/register').send({
      email: emailB,
      password,
      firstName: 'Bob',
      lastName: 'Test',
      phone: `+99890${Math.floor(1000000 + Math.random() * 9000000)}`,
    });

    console.log('USER A RESPONSE BODY:', userA.body)

    expect(userA.status).toBe(201);
    expect(userB.status).toBe(201);

    const loginA = await http.post('/api/auth/login').send({
      email: emailA,
      password,
    });
    const loginB = await http.post('/api/auth/login').send({
      email: emailB,
      password,
    });

    expect(loginA.status).toBe(201);
    expect(loginB.status).toBe(201);

    const tokenA = loginA.body.accessToken;
    const tokenB = loginB.body.accessToken;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startTime = new Date(tomorrow);
    startTime.setHours(10, 0, 0, 0)

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0)

    const [first, second] = await Promise.all([
      http
        .post('/api/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ fieldId, startTime, endTime }),
      http
        .post('/api/bookings')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ fieldId, startTime, endTime }),
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);
    const successful = [first, second].find((res) => res.status === 201);
    const conflicted = [first, second].find((res) => res.status === 409);

    expect(successful).toBeTruthy();
    expect(conflicted).toBeTruthy();
    expect(conflicted?.body?.error).toBe('BOOKING_CONFLICT');

    const total = await prisma.booking.count({
      where: {
        fieldId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    expect(total).toBe(1);
  });
});
