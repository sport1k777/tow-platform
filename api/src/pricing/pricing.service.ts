import { Inject, Injectable } from '@nestjs/common';

import {
  PRICING_PROVIDER,
  type PricingProvider,
  type ResolvedPricing,
} from './pricing.provider';
import type { PricingQuoteInput } from './types';

export type { PricingQuoteInput } from './types';

@Injectable()
export class PricingService {
  constructor(
    @Inject(PRICING_PROVIDER) private readonly provider: PricingProvider,
  ) {}

  quote(input: PricingQuoteInput): Promise<ResolvedPricing> {
    return this.provider.quote(input);
  }
}
