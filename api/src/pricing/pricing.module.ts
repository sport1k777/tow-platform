import { Module } from '@nestjs/common';

import { createPricingProvider } from './create-pricing-provider';
import { ProductionPricingProvider } from './database-pricing.provider';
import { PRICING_PROVIDER } from './pricing.provider';
import { PricingService } from './pricing.service';

@Module({
  providers: [
    ProductionPricingProvider,
    {
      provide: PRICING_PROVIDER,
      inject: [ProductionPricingProvider],
      useFactory: (production: ProductionPricingProvider) =>
        createPricingProvider(production),
    },
    PricingService,
  ],
  exports: [PricingService, PRICING_PROVIDER],
})
export class PricingModule {}
