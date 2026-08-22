import type { PaymentCheckoutInput, PaymentRecord } from './types';

export interface PaymentProvider {
  readonly id: string;
  /** True only for development fixtures. Never treat this as a captured charge. */
  readonly mock: boolean;
  checkout(input: PaymentCheckoutInput): Promise<PaymentRecord>;
}
