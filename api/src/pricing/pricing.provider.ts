import type { PricingQuoteInput, PricingTariff, QuoteBreakdown } from './types';

export type ResolvedPricing = {
  tariff: PricingTariff;
  breakdown: QuoteBreakdown;
};

export interface PricingProvider {
  readonly id: 'mock' | 'database';
  readonly mock: boolean;
  quote(input: PricingQuoteInput): Promise<ResolvedPricing>;
}

export const PRICING_PROVIDER = Symbol('PRICING_PROVIDER');
