import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import request = require('supertest');
/** 
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
let http: ReturnType<typeof agent>;
/**
 * Duplicate Webhook Test (TZ: BR-PAY-2, 15.4, 44.4 №4)
 * Bir xil idempotencyKey bilan kelgan ikkinchi webhook bazada HECH QANDAY o'zgarish yaratmasligi kerak.
 */
describe('Duplicate Webhook Test (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let fieldId: string;

  // --- main.ts dagi sozlamalar bilan bir xil bo'lishi kerak (kerak bo'lsa moslang) ---
  const configureApp = (a: INestApplication) => {
    a.setGlobalPrefix('api/v1');
    a.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  };

  // Webhook HMAC bilan himoyalangan bo'lsa: WEBHOOK_SECRET env va header nomini moslang
  const sign = (body: unknown) => {
    const secret = process.env.WEBHOOK_SECRET;
    return secret
      ? { 'x-signature': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex') }
      : {};
  };

  const sendWebhook = (provider: string, body: Record<string, unknown>) =>
    http.post(`/api/v1/payments/webhook/${provider}`).set(sign(body)).send(body);

  /** Yangi user + PENDING booking + initiate qilingan Payment tayyorlaydi */
  async function preparePayment() {
    const email = `dup-${randomUUID()}@example.com`;
    const password = 'Str0ng!Pass';

    const reg = await http
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Test', lastName: 'User' })
      .expect(201);
    const token: string = reg.body.accessToken;
    const userId: string = reg.body.user.id;

    // Tasodifiy kelajak slot (testlar bir-biriga to'qnashmasligi uchun)
    const day = new Date(Date.now() + (2 + Math.floor(Math.random() * 300)) * 86400000)
      .toISOString()
      .slice(0, 10);
    const hour = 8 + Math.floor(Math.random() * 13);
    const p = (n: number) => String(n).padStart(2, '0');

    const booking = await http
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime: `${day}T${p(hour)}:00:00+05:00`,
        endTime: `${day}T${p(hour + 1)}:00:00+05:00`,
      })
      .expect(201);
    expect(booking.body.status).toBe('PENDING');

    const init = await http
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.body.id });
    expect([200, 201]).toContain(init.status);

    // Webhook uchun haqiqiy qiymatlarni bazadan olamiz (initiate shakliga bog'liq bo'lmaslik uchun)
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

    };http = agent(app.getHttpServer());
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    // Test uchun ACTIVE stadion + Field + har kuni 08:00-23:00 ish vaqti
    const owner = await prisma.user.create({
      data: { email: `owner-${randomUUID()}@example.com`, passwordHash: 'not-used', firstName: 'Owner', lastName: 'Test', role: 'OWNER', isOwnerVerified: true },
    });
    const stadium = await prisma.stadium.create({
      data: { ownerId: owner.id, name: 'Dup Webhook Arena', address: 'Test', latitude: 41.29, longitude: 69.24, phone: '+998712345678', status: 'ACTIVE' },
    });
    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id, name: 'Field 1', fieldType: 'ARTIFICIAL_GRASS', capacity: 10, pricePerHour: 150000,
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: '08:00', closeTime: '23:00' })),
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

    // 1) Webhook #1 — SUCCESS
    const first = await sendWebhook('mock', webhookBody);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });

    // Snapshot: webhook #1 dan keyingi holat
    const paymentBefore = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingBefore = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifBefore = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });

    expect(paymentBefore.status).toBe('SUCCESS');
    expect(bookingBefore.status).toBe('CONFIRMED');
    expect(notifBefore).toBe(1);

    // 2) Webhook #2 — AYNAN SHU so'rov (duplicate)
    const second = await sendWebhook('mock', webhookBody);
    expect(second.status).toBe(200); // xato emas, idempotent javob
    expect(second.body).toEqual({ received: true });

    // 3) Bazada hech qanday qo'shimcha o'zgarish yo'q
    const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingAfter = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifAfter = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });
    const paymentRows = await prisma.payment.count({ where: { bookingId } });

    expect(paymentAfter).toEqual(paymentBefore); // updatedAt ham o'zgarmagan (DB yozuvi bo'lmagan)
    expect(bookingAfter).toEqual(bookingBefore); // Booking qayta CONFIRMED qilinmagan
    expect(notifAfter).toBe(notifBefore); // takroriy notification yo'q
    expect(paymentRows).toBe(1); // yangi Payment yaratilmagan

    // 4) API orqali ham tasdiqlash (GET /payments/:id)
    const apiPayment = await http.get(`/api/v1/payments/${paymentId}`).set('Authorization', `Bearer ${token}`).expect(200);
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
}); // Bir xil idempotencyKey bilan kelgan ikkinchi webhook bazada HECH QANDAY o'zgarish yaratmasligi kerak.
 
describe('Duplicate Webhook Test (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let fieldId: string;

  // --- main.ts dagi sozlamalar bilan bir xil bo'lishi kerak (kerak bo'lsa moslang) ---
  const configureApp = (a: INestApplication) => {
    a.setGlobalPrefix('api/v1');
    a.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  };

  // Webhook HMAC bilan himoyalangan bo'lsa: WEBHOOK_SECRET env va header nomini moslang
  const sign = (body: unknown) => {
    const secret = process.env.WEBHOOK_SECRET;
    return secret
      ? { 'x-signature': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex') }
      : {};
  };

  const sendWebhook = (provider: string, body: Record<string, unknown>) =>
    http.post(`/api/v1/payments/webhook/${provider}`).set(sign(body)).send(body);

  /** Yangi user + PENDING booking + initiate qilingan Payment tayyorlaydi */
  async function preparePayment() {
    const email = `dup-${randomUUID()}@example.com`;
    const password = 'Str0ng!Pass';

    const reg = await http
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Test', lastName: 'User' })
      .expect(201);
    const token: string = reg.body.accessToken;
    const userId: string = reg.body.user.id;

    // Tasodifiy kelajak slot (testlar bir-biriga to'qnashmasligi uchun)
    const day = new Date(Date.now() + (2 + Math.floor(Math.random() * 300)) * 86400000)
      .toISOString()
      .slice(0, 10);
    const hour = 8 + Math.floor(Math.random() * 13);
    const p = (n: number) => String(n).padStart(2, '0');

    const booking = await http
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime: `${day}T${p(hour)}:00:00+05:00`,
        endTime: `${day}T${p(hour + 1)}:00:00+05:00`,
      })
      .expect(201);
    expect(booking.body.status).toBe('PENDING');

    const init = await http
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.body.id });
    expect([200, 201]).toContain(init.status);

    // Webhook uchun haqiqiy qiymatlarni bazadan olamiz (initiate shakliga bog'liq bo'lmaslik uchun)
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

    // Test uchun ACTIVE stadion + Field + har kuni 08:00-23:00 ish vaqti
    const owner = await prisma.user.create({
      data: { email: `owner-${randomUUID()}@example.com`, passwordHash: 'not-used', firstName: 'Owner', lastName: 'Test', role: 'OWNER', isOwnerVerified: true },
    });
    const stadium = await prisma.stadium.create({
      data: { ownerId: owner.id, name: 'Dup Webhook Arena', address: 'Test', latitude: 41.29, longitude: 69.24, phone: '+998712345678', status: 'ACTIVE' },
    });
    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id, name: 'Field 1', fieldType: 'ARTIFICIAL_GRASS', capacity: 10, pricePerHour: 150000,
        workingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: '08:00', closeTime: '23:00' })),
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

    // 1) Webhook #1 — SUCCESS
    const first = await sendWebhook('mock', webhookBody);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });

    // Snapshot: webhook #1 dan keyingi holat
    const paymentBefore = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingBefore = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifBefore = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });

    expect(paymentBefore.status).toBe('SUCCESS');
    expect(bookingBefore.status).toBe('CONFIRMED');
    expect(notifBefore).toBe(1);

    // 2) Webhook #2 — AYNAN SHU so'rov (duplicate)
    const second = await sendWebhook('mock', webhookBody);
    expect(second.status).toBe(200); // xato emas, idempotent javob
    expect(second.body).toEqual({ received: true });

    // 3) Bazada hech qanday qo'shimcha o'zgarish yo'q
    const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const bookingAfter = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const notifAfter = await prisma.notification.count({ where: { userId, type: 'BOOKING_CONFIRMED' } });
    const paymentRows = await prisma.payment.count({ where: { bookingId } });

    expect(paymentAfter).toEqual(paymentBefore); // updatedAt ham o'zgarmagan (DB yozuvi bo'lmagan)
    expect(bookingAfter).toEqual(bookingBefore); // Booking qayta CONFIRMED qilinmagan
    expect(notifAfter).toBe(notifBefore); // takroriy notification yo'q
    expect(paymentRows).toBe(1); // yangi Payment yaratilmagan

    // 4) API orqali ham tasdiqlash (GET /payments/:id)
    const apiPayment = await http.get(`/api/v1/payments/${paymentId}`).set('Authorization', `Bearer ${token}`).expect(200);
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
