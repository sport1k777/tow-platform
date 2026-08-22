import type { PaymentProvider } from './payment.provider';
import type { PaymentCheckoutInput, PaymentRecord } from './types';

/**
 * Development checkout only. Does not contact Apple Pay, Google Pay, or a card acquirer.
 * Replace via createPaymentProvider() when a real processor is connected.
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
