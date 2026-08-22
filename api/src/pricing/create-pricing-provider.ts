import { loadEnv } from '../config/env';
import { ProductionPricingProvider } from './database-pricing.provider';
import { MockPricingProvider } from './mock-pricing.provider';
import type { PricingProvider } from './pricing.provider';

export function createPricingProvider(production: ProductionPricingProvider): PricingProvider {
  const env = loadEnv();
  if (env.PRICING_PROVIDER === 'mock') {
    return new MockPricingProvider();
  }
  return production;
}
