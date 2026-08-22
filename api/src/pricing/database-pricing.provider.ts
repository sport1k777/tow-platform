import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { pricingRules } from '../db/schema';
import { lookupFromQuoteInput, pickTariff } from './lookup';
import { calculateServiceQuote } from './pricing.engine';
import type { PricingProvider, ResolvedPricing } from './pricing.provider';
import {
  parseTariffConfig,
  type PricingQuoteInput,
  type PricingServiceKey,
  type PricingTariff,
  type TowVehicleCategory,
} from './types';
import type { PricingCityCode } from './cities';

@Injectable()
export class ProductionPricingProvider implements PricingProvider {
  readonly id = 'database' as const;
  readonly mock = false;

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async quote(input: PricingQuoteInput): Promise<ResolvedPricing> {
    const lookup = lookupFromQuoteInput(input);
    const rows = await this.db
      .select()
      .from(pricingRules)
      .where(
        and(eq(pricingRules.serviceKey, input.serviceKey), eq(pricingRules.active, true)),
      )
      .orderBy(desc(pricingRules.validFrom));

    const tariffs = rows.map(rowToTariff);
    const tariff = pickTariff(tariffs, lookup);
    if (!tariff) {
      throw new ServiceUnavailableException('Pricing is unavailable for this service');
    }
    return {
      tariff,
      breakdown: calculateServiceQuote(input, tariff),
    };
  }
}

export function rowToTariff(row: typeof pricingRules.$inferSelect): PricingTariff {
  return {
    id: row.id,
    cityCode: (row.cityCode as PricingCityCode | null) ?? null,
    serviceKey: row.serviceKey as PricingServiceKey,
    vehicleCategory: (row.vehicleCategory as TowVehicleCategory | null) ?? null,
    optionKey: row.optionKey,
    baseFeeKopiyky: row.baseFeeKopiyky,
    perKmKopiyky: row.perKmKopiyky,
    minFeeKopiyky: row.minFeeKopiyky,
    nightMultiplierBps: row.nightMultiplierBps,
    weekendMultiplierBps: row.weekendMultiplierBps,
    config: parseTariffConfig(row.config),
    active: row.active,
  };
}
