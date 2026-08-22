import { ServiceUnavailableException } from '@nestjs/common';

import { defaultTariffs } from './catalog';
import { lookupFromQuoteInput, pickTariff } from './lookup';
import { calculateServiceQuote } from './pricing.engine';
import type { PricingProvider, ResolvedPricing } from './pricing.provider';
import type { PricingQuoteInput } from './types';

export class MockPricingProvider implements PricingProvider {
  readonly id = 'mock' as const;
  readonly mock = true;

  constructor(private readonly tariffs = defaultTariffs) {}

  async quote(input: PricingQuoteInput): Promise<ResolvedPricing> {
    const lookup = lookupFromQuoteInput(input);
    const tariff = pickTariff(this.tariffs, lookup);
    if (!tariff) {
      throw new ServiceUnavailableException('Pricing is unavailable for this service');
    }
    return {
      tariff,
      breakdown: calculateServiceQuote(input, tariff),
    };
  }
}
