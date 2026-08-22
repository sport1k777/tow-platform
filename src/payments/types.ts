export const PAYMENT_METHODS = ['cash', 'card', 'apple_pay', 'google_pay'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = 'cash' | 'mock_authorized';

export type PaymentRecord = {
  method: PaymentMethod;
  provider: 'mock';
  status: PaymentStatus;
  mock: true;
};

export type PaymentCheckoutInput = {
  method: PaymentMethod;
  amountKopiyky: number;
  currency: string;
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === 'cash' || value === 'card' || value === 'apple_pay' || value === 'google_pay'
  );
}

export function parsePaymentRecord(details: Record<string, unknown> | null | undefined): PaymentRecord | null {
  const raw = details?.payment;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const payment = raw as Record<string, unknown>;
  if (!isPaymentMethod(payment.method) || payment.provider !== 'mock') {
    return null;
  }
  if (payment.status !== 'cash' && payment.status !== 'mock_authorized') {
    return null;
  }
  return {
    method: payment.method,
    provider: 'mock',
    status: payment.status,
    mock: true,
  };
}
