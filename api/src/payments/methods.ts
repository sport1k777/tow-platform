export const PAYMENT_METHODS = ['cash', 'card', 'apple_pay', 'google_pay'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentRecord = {
  method: PaymentMethod;
  provider: 'mock';
  status: 'cash' | 'mock_authorized';
  mock: true;
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === 'cash' || value === 'card' || value === 'apple_pay' || value === 'google_pay'
  );
}
