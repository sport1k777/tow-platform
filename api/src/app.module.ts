import { Module } from '@nestjs/common';

import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [DatabaseModule, HealthModule, AuthModule, GeoModule],
})
export class AppModule {}
