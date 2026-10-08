import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  it('transactionId qaytaradi va har safar yangi', async () => {
    const p = new MockProvider();
    const a = await p.initiate(100000, 'b1');
    const b = await p.initiate(100000, 'b1');
    expect(a.transactionId).toMatch(/^MOCK-/);
    expect(a.status).toBe('PENDING');
    expect(a.transactionId).not.toEqual(b.transactionId);
  });
});