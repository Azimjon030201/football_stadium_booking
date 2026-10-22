import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';

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
    booking: { userId: 'user-1', field: { stadium: { ownerId: 'owner-1' } } },
  };

  const prisma: any = { payment: { findUnique: jest.fn() } };
  const service = new PaymentsService(prisma);

  beforeEach(() => prisma.payment.findUnique.mockResolvedValue(payment));

  it("to'lov egasi ko'ra oladi", async () => {
    const res = await service.findOne('pay-1', 'user-1', UserRole.USER);
    expect(res.id).toBe('pay-1');
    expect(res).not.toHaveProperty('idempotencyKey');
  });

  it("Admin ko'ra oladi", async () => {
    await expect(service.findOne('pay-1', 'admin-1', UserRole.ADMIN)).resolves.toBeDefined();
  });

  it("stadion egasi o'z stadioni to'lovini ko'ra oladi", async () => {
    await expect(service.findOne('pay-1', 'owner-1', UserRole.OWNER)).resolves.toBeDefined();
  });

  it("boshqa user 403 oladi", async () => {
    await expect(service.findOne('pay-1', 'user-2', UserRole.USER)).rejects.toThrow(ForbiddenException);
  });

  it("boshqa Owner 403 oladi", async () => {
    await expect(service.findOne('pay-1', 'owner-2', UserRole.OWNER)).rejects.toThrow(ForbiddenException);
  });

  it("topilmasa 404", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x', 'user-1', UserRole.USER)).rejects.toThrow(NotFoundException);
  });
});
