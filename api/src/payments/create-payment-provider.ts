import { loadEnv } from '../config/env';
import { MockPaymentProvider } from './mock-payment.provider';
import type { PaymentProvider } from './payment.provider';

export function createPaymentProvider(): PaymentProvider {
  const env = loadEnv();
  if (env.PAYMENT_PROVIDER === 'mock') {
    return new MockPaymentProvider();
  }
  const unsupported: never = env.PAYMENT_PROVIDER;
  throw new Error(`Unsupported PAYMENT_PROVIDER: ${String(unsupported)}`);
}
