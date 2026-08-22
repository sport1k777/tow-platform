import { MockPaymentProvider } from '../src/payments/mock-payment.provider';

describe('MockPaymentProvider', () => {
  const payments = new MockPaymentProvider();

  it('records cash without claiming a card capture', async () => {
    const result = await payments.checkout({
      method: 'cash',
      amountKopiyky: 12_000,
      currency: 'UAH',
    });
    expect(result).toEqual({
      method: 'cash',
      provider: 'mock',
      status: 'cash',
      mock: true,
    });
  });

  it('authorizes card methods as mock only', async () => {
    const result = await payments.checkout({
      method: 'apple_pay',
      amountKopiyky: 12_000,
      currency: 'UAH',
    });
    expect(result.mock).toBe(true);
    expect(result.status).toBe('mock_authorized');
    expect(result.provider).toBe('mock');
  });
});
