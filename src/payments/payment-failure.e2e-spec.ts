import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
// CRON job'ning haqiqiy yo'liga moslang va AppModule'da provider sifatida ro'yxatdan o'tgan bo'lsin:
import { ExpireUnpaidBookingsJob } from './expire-unpaid-bookings.job';

describe('Payment FAILED flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;

  // ── helper'lar ──────────────────────────────────────────────
  async function registerAndLogin() {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `pay-${randomUUID()}@test.uz`,
        password: 'Str0ng!Pass',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);
    return { token: res.body.accessToken as string, userId: res.body.user.id as string };
  }

  // Bazaga to'g'ridan-to'g'ri yozadi: owner -> ACTIVE stadium -> field -> PENDING booking
  async function createPendingBooking() {
    const owner = await prisma.user.create({
      data: {
        email: `owner-${randomUUID()}@test.uz`,
        passwordHash: 'x',
        firstName: 'Own',
        lastName: 'Er',
        role: 'OWNER',
      },
    });
    const stadium = await prisma.stadium.create({
      data: {
        ownerId: owner.id, name: 'Test Arena', address: 'Tashkent',
        latitude: 41.3, longitude: 69.2, phone: '+998712345678', status: 'ACTIVE',
      },
    });
    const field = await prisma.field.create({
      data: {
        stadiumId: stadium.id, name: 'Field 1', fieldType: 'ARTIFICIAL_GRASS',
        capacity: 10, pricePerHour: 150000,
      },
    });
    const start = new Date(Date.now() + 24 * 3600_000);
    start.setMinutes(0, 0, 0);
    return prisma.booking.create({
      data: {
        userId, fieldId: field.id, startTime: start,
        endTime: new Date(start.getTime() + 3600_000),
        duration: 60, price: 150000, status: 'PENDING',
      },
    });
  }

  const initiate = (bookingId: string) =>
    request(app.getHttpServer())
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId });

  const webhook = (p: any, status: 'SUCCESS' | 'FAILED') =>
    request(app.getHttpServer())
      .post('/payments/webhook/mock')
      .send({
        transactionId: p.transactionId,
        bookingId: p.bookingId,
        idempotencyKey: p.idempotencyKey,
        status,
        amount: Number(p.amount),
      });

  const bookingStatus = async (id: string) =>
    (await prisma.booking.findUnique({ where: { id } }))!.status;
  const paymentStatus = async (id: string) =>
    (await prisma.payment.findUnique({ where: { id } }))!.status;

  // ── setup ───────────────────────────────────────────────────
  beforeAll(async () => {
    process.env.PAYMENT_WEBHOOK_SKIP_SIGNATURE = 'true';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true });
    await app.init();
    prisma = app.get(PrismaService);
    ({ token, userId } = await registerAndLogin()); // throttler: faqat 1 marta register
  });
  afterAll(() => app.close());

  // ── testlar ─────────────────────────────────────────────────
  it("FAILED -> Payment=FAILED, Booking=PENDING, qayta urinish SUCCESS bo'ladi", async () => {
    const booking = await createPendingBooking();

    const first = (await initiate(booking.id).expect(201)).body;
    expect(first.status).toBe('PENDING');
    expect(await bookingStatus(booking.id)).toBe('PAYMENT_PENDING');

    await webhook(first, 'FAILED').expect(200);
    expect(await paymentStatus(first.id)).toBe('FAILED');
    expect(await bookingStatus(booking.id)).toBe('PENDING'); // osilib qolmadi

    // Idempotency: xuddi shu FAILED qayta keladi — holat o'zgarmaydi
    await webhook(first, 'FAILED').expect(200);
    expect(await paymentStatus(first.id)).toBe('FAILED');
    expect(await bookingStatus(booking.id)).toBe('PENDING');

    // Qayta urinish: xuddi shu Payment qatori, yangi kalit
    const second = (await initiate(booking.id).expect(201)).body;
    expect(second.id).toBe(first.id);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(await bookingStatus(booking.id)).toBe('PAYMENT_PENDING');

    // Eski urinishning kechikkan FAILED webhooki yangi urinishni buzmaydi
    await webhook(first, 'FAILED').expect(200);
    expect(await paymentStatus(second.id)).toBe('PENDING');

    await webhook(second, 'SUCCESS').expect(200);
    expect(await paymentStatus(second.id)).toBe('SUCCESS');
    expect(await bookingStatus(booking.id)).toBe('CONFIRMED');
  });

  it('FAILED notification yaratiladi', async () => {
    const booking = await createPendingBooking();
    const p = (await initiate(booking.id).expect(201)).body;
    await webhook(p, 'FAILED').expect(200);

    const n = await prisma.notification.findFirst({
      where: { userId, type: 'PAYMENT_FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(n).not.toBeNull();
  });

  it("muddat o'tgach: FAILED -> CRON Booking'ni EXPIRED qiladi, qayta to'lab bo'lmaydi", async () => {
    const booking = await createPendingBooking();
    const p = (await initiate(booking.id).expect(201)).body;
    await webhook(p, 'FAILED').expect(200);
    expect(await bookingStatus(booking.id)).toBe('PENDING');

    await prisma.booking.update({
      where: { id: booking.id },
      data: { createdAt: new Date(Date.now() - 16 * 60_000) },
    });
    await app.get(ExpireUnpaidBookingsJob).run();

    expect(await bookingStatus(booking.id)).toBe('EXPIRED');
    await initiate(booking.id).expect(400); // BOOKING_INVALID_STATE
  });
});