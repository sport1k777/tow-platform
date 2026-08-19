import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { PricingModule } from '../pricing/pricing.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { ServiceTypesController } from './service-types.controller';
import { ServiceTypesService } from './service-types.service';

@Module({
  imports: [AuthModule, GeoModule, PricingModule],
  controllers: [QuotesController, ServiceTypesController],
  providers: [QuotesService, ServiceTypesService],
})
export class QuotesModule {}
