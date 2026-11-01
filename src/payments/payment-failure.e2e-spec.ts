import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentErrors } from 'src/payments/payments.errors';

/**
 * FAILED to'lov oqimi (e2e):
 * initiate -> FAILED webhook -> qayta webhook (idempotent) -> qayta initiate -> noto'g'ri summa.
 * Testlar ketma-ket bog'langan (umumiy holat) — --runInBand bilan yurgiz.
 */
describe('Payment FAILED flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof agent>;

  let token: string;
  let userId: string;
  let ownerId: string;
  let stadiumId: string;
  let fieldId: string;
  let bookingId: string;

  // webhook uchun bazadan olingan haqiqiy qiymatlar
  let amount: number;
  let idempotencyKey: string;
  let transactionId: string;

  const configureApp = (instance: INestApplication) => {
    instance.setGlobalPrefix('api/v1');
    instance.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
  };

  // full-flow.e2e-spec.ts dagi yordamchi bilan bir xil
  const signWebhook = (body: Record<string, unknown>) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-test-secret';
    return {
      'x-signature': createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex'),
    };
  };

  const webhookBody = (over: Record<string, unknown> = {}) => ({
    transactionId,
    bookingId,
    status: 'FAILED',
    amount,
    idempotencyKey,
    ...over,
  });

  const sendWebhook = (body: Record<string, unknown>) =>
    http
      .post('/api/v1/payments/webhook/mock')
      .set(signWebhook(body))
      .send(body);

  const initiate = () =>
    http
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId });

  const failedNotifications = () =>
    prisma.notification.count({ where: { userId, type: 'PAYMENT_FAILED' } });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = agent(app.getHttpServer());

    // Egasi + ACTIVE stadion + maydon + har kuni ish vaqti (payment-flow.e2e-spec.ts kabi)
    const owner = await prisma.user.create({
      data: {
        email: `pf-owner-${randomUUID()}@example.com`,
        passwordHash: 'not-used',
        firstName: 'Owner',
        lastName: 'Test',
        role: 'OWNER',
        isOwnerVerified: true,
      },
    });
    ownerId = owner.id;

    const stadium = await prisma.stadium.create({
      data: {
        ownerId,
        name: 'Payment Failure Arena',
        address: 'Test',
        latitude: 41.29,
        longitude: 69.24,
        phone: '+998712345678',
        status: 'ACTIVE',
      },
    });
    stadiumId = stadium.id;

    const field = await prisma.field.create({
      data: {
        stadiumId,
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

    // Mijoz: API orqali ro'yxatdan o'tadi va login qiladi
    const email = `pf-user-${randomUUID()}@example.com`;
    const password = 'StrongPass123';

    const registerRes = await http
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Test', lastName: 'User' })
      .expect(201);
    userId = registerRes.body.id as string;

    const loginRes = await http
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    token = loginRes.body.accessToken as string;

    // Bron: 3 kun keyin, 10:00-11:00 (Toshkent vaqti)
    const day = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const bookingRes = await http
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldId,
        startTime: `${day}T10:00:00+05:00`,
        endTime: `${day}T11:00:00+05:00`,
      })
      .expect(201);
    bookingId = bookingRes.body.id as string;
    expect(bookingRes.body.status).toBe('PENDING');
  });

  afterAll(async () => {
    try {
      await prisma.notification.deleteMany({ where: { userId } });
      await prisma.payment.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
      await prisma.workingHour.deleteMany({ where: { fieldId } });
      await prisma.field.deleteMany({ where: { id: fieldId } });
      await prisma.stadium.deleteMany({ where: { id: stadiumId } });
      await prisma.user.deleteMany({ where: { id: { in: [userId, ownerId] } } });
    } finally {
      await app.close();
    }
  });

  it('1) initiate -> 201, payment PENDING, booking PAYMENT_PENDING', async () => {
    const res = await initiate().expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.transactionId).toBeTruthy();

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    expect(payment.status).toBe('PENDING');

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(booking.status).toBe('PAYMENT_PENDING');

    amount = Number(payment.amount);
    idempotencyKey = payment.idempotencyKey;
    transactionId = payment.transactionId as string;
    expect(transactionId).toBeTruthy();
  });

  it('2) FAILED webhook -> 200 { received: true }', async () => {
    const res = await sendWebhook(webhookBody()).expect(200);
    expect(res.body).toEqual({ received: true });
  });

  it('3) bazada: payment FAILED, booking PENDING, PAYMENT_FAILED notification bor', async () => {
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(payment.status).toBe('FAILED');
    expect(booking.status).toBe('PENDING');
    expect(await failedNotifications()).toBe(1);
  });

  it('4) shu webhook qayta -> 200, bazada hech narsa o‘zgarmaydi', async () => {
    const paymentBefore = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    const bookingBefore = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });

    const res = await sendWebhook(webhookBody()).expect(200);
    expect(res.body).toEqual({ received: true });

    const paymentAfter = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    const bookingAfter = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(paymentAfter).toEqual(paymentBefore);
    expect(bookingAfter).toEqual(bookingBefore);
    expect(await failedNotifications()).toBe(1);
  });

  it('5) qayta initiate -> muvaffaqiyatli, booking PENDING -> PAYMENT_PENDING', async () => {
    const res = await initiate().expect(201);
    expect(res.body.status).toBe('PENDING');

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(booking.status).toBe('PAYMENT_PENDING');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    expect(payment.status).toBe('PENDING');

    // Mock provider yangi transactionId beradi — 6-qadam uchun yangilaymiz
    expect(payment.transactionId).not.toBe(transactionId);
    transactionId = payment.transactionId as string;
  });

  it('6) noto‘g‘ri summa -> 400 PAYMENT_AMOUNT_MISMATCH, bazada o‘zgarish yo‘q', async () => {
    const res = await sendWebhook(webhookBody({ amount: amount + 1000 })).expect(
      400,
    );
    expect(res.body.error).toBe(PaymentErrors.PAYMENT_AMOUNT_MISMATCH);

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(payment.status).toBe('PENDING');
    expect(booking.status).toBe('PAYMENT_PENDING');
    expect(await failedNotifications()).toBe(1);
  });
});
