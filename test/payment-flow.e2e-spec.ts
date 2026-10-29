import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import { agent } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * To'liq to'lov oqimi (E2E):
 * Booking (PENDING) -> /payments/initiate -> /payments/webhook/mock (SUCCESS) -> Booking = CONFIRMED
 * Zanjir 2 marta, har safar yangi user + yangi booking + yangi payment bilan (eski ma'lumot ishlatilmaydi).
 */
describe('Full payment flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof agent>;
  let fieldId: string;

  const finished: { bookingId: string; paymentId: string }[] = [];

  // main.ts dagi sozlamalar bilan bir xil bo'lishi kerak (kerak bo'lsa moslang)
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

  const pad = (n: number) => String(n).padStart(2, '0');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = agent(app.getHttpServer());

    // Test uchun ACTIVE stadion + Field + har kuni 08:00-23:00 ish vaqti
    const owner = await prisma.user.create({
      data: { email: `owner-${randomUUID()}@example.com`, passwordHash: 'not-used', firstName: 'Owner', lastName: 'Test', role: 'OWNER', isOwnerVerified: true },
    });
    const stadium = await prisma.stadium.create({
      data: { ownerId: owner.id, name: 'Payment Flow Arena', address: 'Test', latitude: 41.29, longitude: 69.24, phone: '+998712345678', status: 'ACTIVE' },
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

  [1, 2].forEach((run) => {
    it(`oqim #${run}: yangi booking -> initiate -> webhook SUCCESS -> CONFIRMED`, async () => {
      // 0) Toza user (har run uchun yangi)
      const reg = await http
        .post('/api/v1/auth/register')
        .send({ email: `flow-${run}-${randomUUID()}@example.com`, password: 'Str0ng!Pass', firstName: 'Flow', lastName: 'Tester' })
        .expect(201);
      const token: string = reg.body.accessToken;
      const auth = { Authorization: `Bearer ${token}` };

      // 1) Booking yaratish (kelajakdagi tasodifiy slot, har run uchun boshqacha)
      const day = new Date(Date.now() + (10 + run * 3 + Math.floor(Math.random() * 200)) * 86400000)
        .toISOString()
        .slice(0, 10);
      const hour = 8 + Math.floor(Math.random() * 13); // 08..20
      const bookingRes = await http
        .post('/api/v1/bookings')
        .set(auth)
        .send({
          fieldId,
          startTime: `${day}T${pad(hour)}:00:00+05:00`,
          endTime: `${day}T${pad(hour + 1)}:00:00+05:00`,
        })
        .expect(201);

      const bookingId: string = bookingRes.body.id;
      expect(bookingRes.body.status).toBe('PENDING');
      expect(Number(bookingRes.body.price)).toBe(150000); // backend hisoblagan narx (BR-PRICE-1)

      // 2) To'lovni boshlash
      const init = await http.post('/api/v1/payments/initiate').set(auth).send({ bookingId });
      expect([200, 201]).toContain(init.status);

      const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId } });
      expect(['INITIATED', 'PENDING']).toContain(payment.status);
      expect(Number(payment.amount)).toBe(150000);

      // Webhook oldidan: bron hali tasdiqlanmagan
      const beforeWebhook = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(beforeWebhook.status).not.toBe('CONFIRMED');

      // 3) Webhook: to'lov muvaffaqiyatli (server-to-server)
      const webhookBody = {
        transactionId: payment.transactionId ?? `mock-tx-${randomUUID()}`,
        bookingId,
        status: 'SUCCESS',
        amount: Number(payment.amount),
        idempotencyKey: payment.idempotencyKey,
      };
      const webhook = await http.post('/api/v1/payments/webhook/mock').set(sign(webhookBody)).send(webhookBody);
      expect(webhook.status).toBe(200);
      expect(webhook.body).toEqual({ received: true });

      // 4) Booking = CONFIRMED, Payment = SUCCESS (bazada)
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(booking.status).toBe('CONFIRMED');
      expect(paymentAfter.status).toBe('SUCCESS');

      // 5) API orqali ham tasdiqlash
      const apiBooking = await http.get(`/api/v1/bookings/${bookingId}`).set(auth).expect(200);
      expect(apiBooking.body.status).toBe('CONFIRMED');

      const apiPayment = await http.get(`/api/v1/payments/${payment.id}`).set(auth).expect(200);
      expect(apiPayment.body.status).toBe('SUCCESS');

      // 6) Foydalanuvchiga notification yaratilgan
      const notif = await prisma.notification.count({
        where: { userId: reg.body.user.id, type: 'BOOKING_CONFIRMED' },
      });
      expect(notif).toBe(1);

      finished.push({ bookingId, paymentId: payment.id });
    });
  });

  it('ikkala oqim bir-biridan mustaqil (turli booking va payment)', () => {
    expect(finished).toHaveLength(2);
    expect(finished[0].bookingId).not.toBe(finished[1].bookingId);
    expect(finished[0].paymentId).not.toBe(finished[1].paymentId);
  });
});
