import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  const provider = new MockProvider();
  const params = (key: string) => ({
    paymentId: 'p1',
    bookingId: 'b1',
    amount: '150000.00',
    currency: 'UZS',
    idempotencyKey: key,
  });

  it('nomi MOCK', () => {
    expect(provider.name).toBe('MOCK');
  });

  it('mock-tx- prefiksli transactionId qaytaradi', async () => {
    const r = await provider.initiate(params('k1'));
    expect(r.transactionId).toMatch(/^mock-tx-[0-9a-f-]{36}$/);
  });



  it('har chaqiriqda noyob transactionId', async () => {
    const a = await provider.initiate(params('k1'));
    const b = await provider.initiate(params('k2'));
    expect(a.transactionId).not.toBe(b.transactionId);
  });
});
