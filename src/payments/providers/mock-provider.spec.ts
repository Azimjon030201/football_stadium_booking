import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('SUCCESS va mock-tx- prefiksli transactionId qaytaradi', async () => {
    const r = await provider.initiate(150000, 'booking-1');
    expect(r.status).toBe('SUCCESS');
    expect(r.transactionId).toMatch(/^mock-tx-[0-9a-f-]{36}$/);
  });

  it('har chaqiriqda noyob transactionId', async () => {
    const a = await provider.initiate(1000, 'b1');
    const b = await provider.initiate(1000, 'b1');
    expect(a.transactionId).not.toBe(b.transactionId);
  });

  it('refund REFUNDED qaytaradi', async () => {
    expect((await provider.refund('mock-tx-1', 1000)).status).toBe('REFUNDED');
  });
});