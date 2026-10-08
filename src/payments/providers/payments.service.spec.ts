import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';

const mkBooking = (over: any = {}) => ({
  id: 'b1', userId: 'u1', status: 'PENDING', price: '100000.00', payment: null, ...over,
});

function setup(booking: any) {
  const tx: any = {
    payment: {
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'p1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
    },
    booking: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma: any = {
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    payment: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const provider = new MockProvider();
  const spy = jest.spyOn(provider, 'initiate');
  return { svc: new PaymentsService(prisma, provider), prisma, tx, spy };
}

describe('PaymentsService.initiate', () => {
  it('summani bazadagi narxdan oladi va booking PAYMENT_PENDING bo\'ladi', async () => {
    const { svc, tx, spy } = setup(mkBooking());
    const r = await svc.initiate('b1', 'u1');
    expect(r.amount).toBe(100000);
    expect(r.status).toBe('PENDING');
    expect(spy).toHaveBeenCalledWith(100000, 'b1');
    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAYMENT_PENDING' } }),
    );
  });

  it('faol to\'lov bo\'lsa o\'shani qaytaradi (dublikat yo\'q)', async () => {
    const payment = { id: 'p9', bookingId: 'b1', amount: 100000, status: 'PENDING', transactionId: 'MOCK-1', idempotencyKey: 'k' };
    const { svc, tx } = setup(mkBooking({ status: 'PAYMENT_PENDING', payment }));
    const r = await svc.initiate('b1', 'u1');
    expect(r.paymentId).toBe('p9');
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('404 / 403 / 409', async () => {
    await expect(setup(null).svc.initiate('x', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup(mkBooking()).svc.initiate('b1', 'other')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup(mkBooking({ status: 'CONFIRMED' })).svc.initiate('b1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('SUCCESS to\'lov bo\'lsa PAYMENT_ALREADY_PROCESSED', async () => {
    const payment = { id: 'p9', bookingId: 'b1', amount: 1, status: 'SUCCESS', transactionId: 't', idempotencyKey: 'k' };
    await expect(setup(mkBooking({ payment })).svc.initiate('b1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });
});