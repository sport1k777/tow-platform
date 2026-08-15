import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { createGeoProvider } from './create-geo-provider';
import { GEO_PROVIDER } from './geo.provider';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [AuthModule],
  controllers: [GeoController],
  providers: [
    GeoService,
    {
      provide: GEO_PROVIDER,
      useFactory: createGeoProvider,
    },
  ],
})
export class GeoModule {}
