import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import {
  pricingRules,
  type serviceKeyEnum,
  type vehicleCategoryEnum,
} from '../db/schema';

export type ServiceKey = (typeof serviceKeyEnum.enumValues)[number];
export type VehicleCategory = (typeof vehicleCategoryEnum.enumValues)[number];

@Injectable()
export class PricingService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getActiveRule(serviceKey: ServiceKey, vehicleCategory?: VehicleCategory) {
    if (vehicleCategory) {
      const [specific] = await this.db
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.serviceKey, serviceKey),
            eq(pricingRules.vehicleCategory, vehicleCategory),
            eq(pricingRules.active, true),
          ),
        )
        .orderBy(desc(pricingRules.validFrom))
        .limit(1);
      if (specific) {
        return specific;
      }
    }

    const [fallback] = await this.db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.serviceKey, serviceKey),
          isNull(pricingRules.vehicleCategory),
          eq(pricingRules.active, true),
        ),
      )
      .orderBy(desc(pricingRules.validFrom))
      .limit(1);

    if (!fallback) {
      throw new ServiceUnavailableException('Pricing is unavailable for this service');
    }

    return fallback;
  }
}
