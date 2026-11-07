import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Full user flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof agent>;

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

  const makeUnique = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const signWebhook = (body: Record<string, unknown>) => {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-test-secret';
    return {
      'x-signature': createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex'),
    };
  };

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('Register -> Login -> Create Stadium -> Create Field -> Check Availability -> Create Booking -> Payment Initiate -> Webhook -> Booking CONFIRMED', async () => {
    const ownerEmail = makeUnique('owner');
    const ownerPassword = 'StrongPass123';

    const registerRes = await http
      .post('/api/v1/auth/register')
      .send({
        email: `${ownerEmail}@example.com`,
        password: ownerPassword,
        firstName: 'Test',
        lastName: 'Owner',
      })
      .expect(201);

    expect(registerRes.body).toHaveProperty('id');
    expect(registerRes.body.email).toBe(`${ownerEmail}@example.com`);

    const loginRes = await http
      .post('/api/v1/auth/login')
      .send({
        email: `${ownerEmail}@example.com`,
        password: ownerPassword,
      })
      .expect(201);

    const ownerToken = loginRes.body.accessToken as string;
    expect(ownerToken).toBeTruthy();
    expect(loginRes.body.user.email).toBe(`${ownerEmail}@example.com`);

    const stadiumRes = await http
      .post('/api/v1/stadiums')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Test Flow Arena',
        address: 'Tashkent, Uzbekistan',
        latitude: 41.2995,
        longitude: 69.2401,
        phone: '+998901234567',
      })
      .expect(201);

    const stadiumId = stadiumRes.body.id as string;
    expect(stadiumRes.body.ownerId).toBeTruthy();
    expect(stadiumRes.body.status).toBe('DRAFT');

    const submitRes = await http
      .post(`/api/v1/stadiums/${stadiumId}/submit`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(submitRes.body.status).toBe('PENDING');

    const adminEmail = makeUnique('admin');
    const adminUser = await prisma.user.create({
      data: {
        email: `${adminEmail}@example.com`,
        passwordHash: await bcrypt.hash('StrongPass123', 12),
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const adminLogin = await http
      .post('/api/v1/auth/login')
      .send({
        email: `${adminEmail}@example.com`,
        password: 'StrongPass123',
      })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;
    expect(adminToken).toBeTruthy();

    const approveRes = await http
      .patch(`/api/v1/stadiums/admin/stadiums/${stadiumId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(approveRes.body.status).toBe('ACTIVE');

    const fieldRes = await http
      .post(`/api/v1/stadiums/${stadiumId}/fields`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Mini Pitch 1',
        fieldType: 'ARTIFICIAL_GRASS',
        capacity: 10,
        size: '25x15 m',
        pricePerHour: 200000,
      })
      .expect(201);

    const fieldId = fieldRes.body.id as string;
    expect(fieldRes.body.stadiumId).toBe(stadiumId);
    expect(fieldRes.body.isActive).toBe(true);

    const bookingDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    bookingDate.setHours(9, 0, 0, 0);
    const bookingDateIso = bookingDate.toISOString();

    await http
      .put(`/api/v1/fields/${fieldId}/working-hours`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send([
        {
          dayOfWeek: bookingDate.getDay(),
          openTime: '08:00',
          closeTime: '23:00',
          isClosed: false,
        },
      ])
      .expect(200);

    const availabilityRes = await http
      .get(`/api/v1/fields/${fieldId}/availability?date=${bookingDate.toISOString().slice(0, 10)}`)
      .expect(200);

    expect(availabilityRes.body).toHaveProperty('slots');
    expect(Array.isArray(availabilityRes.body.slots)).toBe(true);
    expect(availabilityRes.body.slots.length).toBeGreaterThan(0);

    const startTime = new Date(bookingDate.getTime());
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const bookingRes = await http
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        fieldId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(201);

    const bookingId = bookingRes.body.id as string;
    expect(bookingRes.body.status).toBe('PENDING');
    expect(Number(bookingRes.body.price)).toBeGreaterThan(0);

    const paymentRes = await http
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId })
      .expect(201);

    expect(paymentRes.body.status).toBe('PENDING');
    expect(paymentRes.body.transactionId).toBeTruthy();

    const paymentRecord = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });

    expect(paymentRecord.bookingId).toBe(bookingId);
    expect(paymentRecord.status).toBe('PENDING');

    const webhookBody = {
      transactionId: paymentRecord.transactionId ?? 'mock-tx-123',
      bookingId,
      status: 'SUCCESS',
      amount: Number(paymentRecord.amount),
      idempotencyKey: paymentRecord.idempotencyKey,
    };

    const webhookRes = await http
      .post('/api/v1/payments/webhook/mock')
      .set(signWebhook(webhookBody))
      .send(webhookBody)
      .expect(200);

    expect(webhookRes.body).toEqual({ received: true });

    const confirmedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(confirmedBooking.status).toBe('CONFIRMED');

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { bookingId },
    });
    expect(updatedPayment.status).toBe('SUCCESS');

    const bookingApiRes = await http
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(bookingApiRes.body.status).toBe('CONFIRMED');

    const paymentApiRes = await http
      .get(`/api/v1/payments/${updatedPayment.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(paymentApiRes.body.status).toBe('SUCCESS');

    const notificationCount = await prisma.notification.count({
      where: {
        userId: registerRes.body.id,
        type: 'BOOKING_CONFIRMED',
      },
    });

    expect(notificationCount).toBeGreaterThan(0);

    await prisma.notification.deleteMany({
      where: { userId: registerRes.body.id },
    });
    await prisma.payment.deleteMany({ where: { bookingId } });
    await prisma.booking.delete({ where: { id: bookingId } });
    await prisma.workingHour.deleteMany({ where: { fieldId } });
    await prisma.field.delete({ where: { id: fieldId } });
    await prisma.stadium.delete({ where: { id: stadiumId } });
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: `${ownerEmail}@example.com` }, { email: `${adminEmail}@example.com` }],
      },
    });
  });
});
