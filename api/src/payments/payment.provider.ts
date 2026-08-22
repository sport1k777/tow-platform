import type { PaymentMethod, PaymentRecord } from './methods';

export type PaymentCheckoutInput = {
  method: PaymentMethod;
  amountKopiyky: number;
  currency: string;
};

export interface PaymentProvider {
  readonly id: string;
  readonly mock: boolean;
  checkout(input: PaymentCheckoutInput): Promise<PaymentRecord>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
