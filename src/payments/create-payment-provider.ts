import { MockPaymentProvider } from './mock-payment.provider';
import type { PaymentProvider } from './payment.provider';

/**
 * EXPO_PUBLIC_PAYMENT_PROVIDER=mock
 * A Stripe/LiqPay/Apple Pay adapter can be added here later without changing screens.
 */
export function createPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

export const paymentProvider = createPaymentProvider();
