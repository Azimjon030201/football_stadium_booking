import  request from 'supertest';
// app, token, bookingId ni o'zingizning e2e setup'ingizdan oling (Register → Login → Create Booking)
declare const app: any;
declare let token: string;
declare let bookingId: string;
declare const prisma: any;

const auth = () => ({ Authorization: `Bearer ${token}` });
const hook = (b: object) => request(app.getHttpServer()).post('/api/v1/payments/webhook/mock').send(b);

describe('Payment FAILED path', () => {
  it('FAILED webhook → Payment FAILED, Booking PENDING, retry works', async () => {
    // 1-urinish
    const p1 = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate').set(auth()).send({ bookingId }).expect(201);

    let booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking.status).toBe('PAYMENT_PENDING');

    const failBody = {
      transactionId: p1.body.transactionId, bookingId, status: 'FAILED',
      amount: Number(p1.body.amount), idempotencyKey: p1.body.idempotencyKey,
    };
    await hook(failBody).expect(200);

    let payment = await prisma.payment.findUnique({ where: { bookingId } });
    booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(payment.status).toBe('FAILED');
    expect(booking.status).toBe('PENDING'); // osilib qolmadi

    // Duplicate FAILED webhook → 200, hech narsa o'zgarmaydi
    await hook(failBody).expect(200);

    // 2-urinish (retry)
    const p2 = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate').set(auth()).send({ bookingId }).expect(201);
    expect(p2.body.transactionId).not.toBe(p1.body.transactionId);

    // Eski (stale) FAILED webhook yangi urinishga ta'sir qilmaydi
    await hook(failBody).expect(200);
    payment = await prisma.payment.findUnique({ where: { bookingId } });
    expect(payment.status).toBe('INITIATED');

    // Yangi urinish SUCCESS
    await hook({
      transactionId: p2.body.transactionId, bookingId, status: 'SUCCESS',
      amount: Number(p2.body.amount), idempotencyKey: p2.body.idempotencyKey,
    }).expect(200);
    booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking.status).toBe('CONFIRMED');
  });

  it('SUCCESS bo‘lgan bron uchun qayta initiate → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate').set(auth()).send({ bookingId }).expect(409);
  });
});
