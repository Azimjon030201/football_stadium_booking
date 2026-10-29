import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { MockProvider } from './providers/mock-provider';

// ============================================================

// ============================================================
describe('PaymentsService.findOne', () => {
  const payment = {
    id: 'pay-1',
    bookingId: 'bk-1',
    amount: '150000.00',
    currency: 'UZS',
    provider: 'MOCK',
    transactionId: 'tx-1',
    status: 'SUCCESS',
    idempotencyKey: 'idem-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    booking: {
      userId: 'user-1',
      field: {
        stadium: {
          ownerId: 'owner-1',
        },
      },
    },
  };

  const prisma: any = {
    payment: {
      findUnique: jest.fn(),
    },
  };

  const service = new PaymentsService(prisma, new MockProvider());

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payment.findUnique.mockResolvedValue(payment);
  });

  it('to‘lov egasi ko‘ra oladi', async () => {
    const result = await service.findOne(
      'pay-1',
      'user-1',
      UserRole.USER,
    );

    expect(result.id).toBe('pay-1');
    expect(result).not.toHaveProperty('idempotencyKey');
    expect(result).not.toHaveProperty('booking');
  });

  it('Admin ko‘ra oladi', async () => {
    await expect(
      service.findOne('pay-1', 'admin-1', UserRole.ADMIN),
    ).resolves.toBeDefined();
  });

  it('stadion egasi o‘z stadioni to‘lovini ko‘ra oladi', async () => {
    await expect(
      service.findOne('pay-1', 'owner-1', UserRole.OWNER),
    ).resolves.toBeDefined();
  });

  it('boshqa user 403 oladi', async () => {
    await expect(
      service.findOne('pay-1', 'user-2', UserRole.USER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('boshqa Owner 403 oladi', async () => {
    await expect(
      service.findOne('pay-1', 'owner-2', UserRole.OWNER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('OWNER roli bo‘lmasa stadion egaligi ruxsat bermaydi', async () => {
    await expect(
      service.findOne('pay-1', 'owner-1', UserRole.USER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('topilmasa 404', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('x', 'user-1', UserRole.USER),
    ).rejects.toThrow(NotFoundException);
  });
});

// ============================================================
// TESTLAR — handleWebhook (SRS 15.3, BR-PAY-1/2, 44.4 #4)
// ============================================================
describe('PaymentsService.handleWebhook', () => {
  const tx = {
    payment: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    booking: { update: jest.fn() },
    notification: { create: jest.fn() },
  };

  const prisma: any = {
    payment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new PaymentsService(prisma, new MockProvider());

  const payment = {
    id: 'pay-1',
    bookingId: 'bk-1',
    amount: '150000.00',
    status: 'INITIATED',
    booking: { userId: 'user-1' },
  };

  const dto: any = {
    transactionId: 'mock-tx-9981',
    bookingId: 'bk-1',
    status: 'SUCCESS',
    amount: 150000,
    idempotencyKey: 'idem-9981',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payment.findFirst.mockResolvedValue({ ...payment });
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    // tranzaksiya ichida o'qilgan "joriy" holat — hali yakunlanmagan
    tx.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'bk-1',
      status: 'PENDING',
    });
  });

  it('SUCCESS → payment SUCCESS, booking CONFIRMED, notification BOOKING_CONFIRMED', async () => {
    const result = await service.handleWebhook('mock', { ...dto });

    expect(result).toEqual({ received: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // payment bookingId yoki idempotencyKey bo'yicha qidiriladi
    expect(prisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ bookingId: 'bk-1' }, { idempotencyKey: 'idem-9981' }],
        },
      }),
    );

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'SUCCESS', transactionId: 'mock-tx-9981' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: { status: 'CONFIRMED' },
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'BOOKING_CONFIRMED',
        metadata: { bookingId: 'bk-1', paymentId: 'pay-1' },
      }),
    });
  });

  it('FAILED → payment FAILED, booking PENDING (CONFIRMED emas!), notification PAYMENT_FAILED', async () => {
    const result = await service.handleWebhook('mock', {
      ...dto,
      status: 'FAILED',
    });

    expect(result).toEqual({ received: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'FAILED', transactionId: 'mock-tx-9981' },
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: { status: 'PENDING' },
    });
    expect(tx.booking.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    );
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'PAYMENT_FAILED',
        metadata: { bookingId: 'bk-1', paymentId: 'pay-1' },
      }),
    });
  });

  it.each(['SUCCESS', 'FAILED'])(
    'takroriy webhook (payment allaqachon %s) → $transaction chaqirilmaydi, { received: true }',
    async (finalStatus) => {
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        status: finalStatus,
      });

      const result = await service.handleWebhook('mock', { ...dto });

      expect(result).toEqual({ received: true });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.payment.update).not.toHaveBeenCalled();
      expect(tx.booking.update).not.toHaveBeenCalled();
      expect(tx.notification.create).not.toHaveBeenCalled();
    },
  );

  it('poyga holati: tranzaksiya ichida payment allaqachon yakunlangan bo‘lsa — hech narsa yangilanmaydi', async () => {
    tx.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'pay-1',
      bookingId: 'bk-1',
      status: 'SUCCESS',
    });

    const result = await service.handleWebhook('mock', { ...dto });

    expect(result).toEqual({ received: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.booking.update).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('summa mos kelmasa → BadRequestException', async () => {
    await expect(
      service.handleWebhook('mock', { ...dto, amount: 99999 }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('payment topilmasa → NotFoundException', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.handleWebhook('mock', { ...dto }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('noma’lum provider → BadRequestException, bazaga murojaat qilinmaydi', async () => {
    await expect(
      service.handleWebhook('click', { ...dto }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});