import { UserRole } from '@prisma/client';
import { OwnerService } from './owner.service (1)';

describe('OwnerService.getBookings', () => {
  const prisma: any = {
    booking: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const service = new OwnerService(prisma);
  const owner = { id: 'owner-1', role: UserRole.OWNER };
  const admin = { id: 'admin-1', role: UserRole.ADMIN };

  const lastWhere = () => prisma.booking.findMany.mock.calls[0][0].where;
  const lastArgs = () => prisma.booking.findMany.mock.calls[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.booking.findMany.mockResolvedValue([{ id: 'bk-1' }]);
    prisma.booking.count.mockResolvedValue(45);
  });

  it('OWNER: faqat o\'z stadionlari (Stadium -> Field -> Booking zanjiri)', async () => {
    await service.getBookings(owner, {});
    expect(lastWhere().field.stadium.ownerId).toBe('owner-1');
    expect(lastWhere()).not.toHaveProperty('status');
  });

  it('count ham xuddi shu where bilan chaqiriladi', async () => {
    await service.getBookings(owner, {});
    expect(prisma.booking.count).toHaveBeenCalledWith({ where: lastWhere() });
  });

  it('status filtri qo\'llanadi', async () => {
    await service.getBookings(owner, { status: 'CONFIRMED' });
    expect(lastWhere().status).toBe('CONFIRMED');
    expect(lastWhere().field.stadium.ownerId).toBe('owner-1');
  });

  it('stadiumId/fieldId ownerId ni almashtira olmaydi (boshqa Owner stadioni sizib chiqmaydi)', async () => {
    await service.getBookings(owner, { stadiumId: 'st-of-other-owner', fieldId: 'fl-9' });
    expect(lastWhere().field.id).toBe('fl-9');
    expect(lastWhere().field.stadium).toEqual({ ownerId: 'owner-1', id: 'st-of-other-owner' });
  });

  it('ADMIN: ownerId sharti yo\'q (hamma bronlar)', async () => {
    await service.getBookings(admin, {});
    expect(lastWhere().field.stadium).not.toHaveProperty('ownerId');
  });

  it('sana oralig\'i: from <= startTime < to', async () => {
    await service.getBookings(owner, { from: '2026-09-20T00:00:00+05:00', to: '2026-09-21T00:00:00+05:00' });
    expect(lastWhere().startTime.gte).toEqual(new Date('2026-09-20T00:00:00+05:00'));
    expect(lastWhere().startTime.lt).toEqual(new Date('2026-09-21T00:00:00+05:00'));
  });

  it('limit > 100 bo\'lsa 100 ga cheklanadi, skip to\'g\'ri', async () => {
    const res = await service.getBookings(owner, { page: 3, limit: 500 });
    expect(lastArgs().take).toBe(100);
    expect(lastArgs().skip).toBe(200);
    expect(res.meta).toEqual({ page: 3, limit: 100, total: 45, totalPages: 1 });
  });

  it('default: page=1, limit=20, startTime desc; meta.totalPages to\'g\'ri', async () => {
    const res = await service.getBookings(owner, {});
    expect(lastArgs().skip).toBe(0);
    expect(lastArgs().take).toBe(20);
    expect(lastArgs().orderBy).toEqual({ startTime: 'desc' });
    expect(res.meta).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
    expect(res.data).toHaveLength(1);
  });

  it('user: passwordHash va email qaytarilmaydi', async () => {
    await service.getBookings(owner, {});
    const userSelect = lastArgs().select.user.select;
    expect(userSelect).not.toHaveProperty('passwordHash');
    expect(userSelect).not.toHaveProperty('email');
    expect(lastArgs().select.payment.select).toEqual({ status: true }); // idempotencyKey yo'q
  });

  it('deletedAt filtri yo\'q (arxivlangan stadion tarixi ko\'rinadi)', async () => {
    await service.getBookings(owner, {});
    expect(JSON.stringify(lastWhere())).not.toContain('deletedAt');
  });
});
