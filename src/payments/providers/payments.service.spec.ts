import { MockProvider } from './mock-provider';
import { PaymentsService } from '../payments.service';

const mkBooking = (over: any = {}) => ({
  id: 'b1', userId: 'u1', status: 'PENDING', price: '100000.00', ...over,
});

function setup(booking: any, updateCount = 1) {
  const tx: any = {
    booking: { updateMany: jest.fn().mockResolvedValue({ count: updateCount }) },
    payment: {
      upsert: jest.fn().mockImplementation(async ({ create }) => ({
        id: 'p1', currency: 'UZS', amount: create.amount, ...create,
      })),
    },
  };
  const prisma: any = {
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    payment: {
      update: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'p1', amount: '100000.00', currency: 'UZS', ...data,
      })),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const provider = new MockProvider();
  const spy = jest.spyOn(provider, 'initiate');
  return { svc: new PaymentsService(prisma, provider), prisma, tx, spy };
}

const codeOf = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return { status: e.getStatus(), body: e.getResponse() }; }
  return null;
};

describe('PaymentsService.initiatePayment', () => {
  it('summani bazadagi narxdan oladi, booking PAYMENT_PENDING ga o\'tadi', async () => {
    const { svc, tx, spy, prisma } = setup(mkBooking());
    const r = await svc.initiatePayment('b1', 'u1');

    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', userId: 'u1', status: 'PENDING' },
      data: { status: 'PAYMENT_PENDING' },
    });
    expect(tx.payment.upsert.mock.calls[0][0].create.amount).toBe('100000.00');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(r.status).toBe('PENDING');
    expect(r.transactionId).toMatch(/^mock-tx-/);
  });

  it('bron topilmasa 404 BOOKING_NOT_FOUND', async () => {
    const { svc } = setup(null);
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(404);
    expect((e?.body as any).error).toBe('BOOKING_NOT_FOUND');
  });

  it('boshqa foydalanuvchi broni uchun 403 FORBIDDEN_RESOURCE', async () => {
    const { svc } = setup(mkBooking({ userId: 'other' }));
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(403);
    expect((e?.body as any).error).toBe('FORBIDDEN_RESOURCE');
  });

  it('bron PENDING bo\'lmasa 400 BOOKING_INVALID_STATE, provider chaqirilmaydi', async () => {
    const { svc, spy } = setup(mkBooking({ status: 'CONFIRMED' }));
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect(e?.status).toBe(400);
    expect((e?.body as any).error).toBe('BOOKING_INVALID_STATE');
    expect(spy).not.toHaveBeenCalled();
  });

  it('parallel so\'rovda (updateMany count=0) 400 va provider chaqirilmaydi', async () => {
    const { svc, spy } = setup(mkBooking(), 0);
    const e = await codeOf(svc.initiatePayment('b1', 'u1'));
    expect((e?.body as any).error).toBe('BOOKING_INVALID_STATE');
    expect(spy).not.toHaveBeenCalled();
  });
});
