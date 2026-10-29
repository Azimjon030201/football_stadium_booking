import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Duplicate Webhook Test (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let fieldId: string;

  const configureApp = (a: INestApplication) => {
    a.setGlobalPrefix('api/v1');
    a.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
  };

  const sign = (body: unknown) => {
    const secret = process.env.WEBHOOK_SECRET;
    return secret
      ? { 'x-signature': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex') }
      : {};
  };

  const sendWebhook = (provider: string, body: Record<string, unknown>) =>
    http.post(`/api/v1/payments/webhook/${provider}`).set(sign(body)).send(body);

  async function preparePayment() {
    const email = `dup-${randomUUID()}@example.com`;
    const password = 'Str0ng!Pass';

    const reg = await http
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Test', lastName: 'User' })
      .expect(201);

    const token: string = reg.body.accessToken;
    const userId: string = reg.body.user.id;
    const day = new Date(Date.now() + (2 + Math.floor(Math.random() * 300)) * 86400000)
      .toISOString()
      .slice(0, 10);
    const hour = 8 + Math.floor(Math.random() * 13);
    const pad = (n: number) => String(n).padStart(2, '0');

    const booking = await http
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime: `${day}T${pad(hour)}:00:00+05:00`,
        endTime: `${day}T${pad(hour + 1)}:00:00+05:00`,
      })
      .expect(201);

    expect(booking.body.status).toBe('PENDING');

    const init = await http
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.body.id });
    expect([200, 201]).toContain(init.status);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.body.id } });

    return {
      token,
      userId,
      bookingId: booking.body.id as string,
      paymentId: payment.id,
      webhookBody: {
        transactionId: payment.transactionId ?? `mock-tx-${randomUUID()}`,
        bookingId: booking.body.id,
        status: 'SUCCESS',
        amount: Number(payment.amount),
        idempotencyKey: payment.idempotencyKey,
      } as Record<string, unknown>,
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    const owner = await prisma.user.create({
      data: {
        email: `owner-${randomUUID()}@example.com`,
        passwordHash: 'not-used',
        firstName: 'Owner',
        lastName: 'Test',
        role: 'OWNER',
        isOwnerVerified: true,
      },
    });

    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner.id,
        name: 'Dup Webhook Arena',
        address: 'Test',
        latitude: 41.29,
        longitude: 69.24,
        phone: '+998712345678',
        status: 'ACTIVE',
      },
    });

    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id,
        name: 'Field 1',
        fieldType: 'ARTIFICIAL_GRASS',
        capacity: 10,
        pricePerHour: 150000,
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
            dayOfWeek: d,
            openTime: '08:00',
            closeTime: '23:00',
          })),
        },
      },
    });

    fieldId = field.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('bir xil idempotencyKey bilan ikkinchi webhook hech narsani o\'zgartirmaydi', async () => {
    const { token, userId, bookingId, paymentId, webhookBody } = await preparePayment();

    const first = await sendWebhook('mock', webhookBody);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });

    const paymentBefore = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingBefore = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifBefore = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });

    expect(paymentBefore.status).toBe('SUCCESS');
    expect(bookingBefore.status).toBe('CONFIRMED');
    expect(notifBefore).toBe(1);

    const second = await sendWebhook('mock', webhookBody);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ received: true });

    const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingAfter = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifAfter = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });
    const paymentRows = await prisma.payment.count({ where: { bookingId } });

    expect(paymentAfter).toEqual(paymentBefore);
    expect(bookingAfter).toEqual(bookingBefore);
    expect(notifAfter).toBe(notifBefore);
    expect(paymentRows).toBe(1);

    const apiPayment = await http
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(apiPayment.body.status).toBe('SUCCESS');
  });

  it('bir vaqtning o\'zida kelgan ikkita bir xil webhook ham faqat bir marta qayta ishlanadi', async () => {
    const { userId, bookingId, paymentId, webhookBody } = await preparePayment();

    const [a, b] = await Promise.all([sendWebhook('mock', webhookBody), sendWebhook('mock', webhookBody)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifs = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });

    expect(payment.status).toBe('SUCCESS');
    expect(booking.status).toBe('CONFIRMED');
    expect(notifs).toBe(1);
  });
});
