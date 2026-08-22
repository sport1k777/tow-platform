import type { PaymentCheckoutInput, PaymentProvider } from './payment.provider';
import type { PaymentRecord } from './methods';

/**
 * Development checkout. Does not capture funds or call a card network.
 * Swap via createPaymentProvider() when a real processor is connected.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = 'mock-payment';
  readonly mock = true;

  async checkout(input: PaymentCheckoutInput): Promise<PaymentRecord> {
    if (input.method === 'cash') {
      return {
        method: 'cash',
        provider: 'mock',
        status: 'cash',
        mock: true,
      };
    }
    return {
      method: input.method,
      provider: 'mock',
      status: 'mock_authorized',
      mock: true,
    };
  }
}
