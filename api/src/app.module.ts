import { Module } from '@nestjs/common';

import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { GeoModule } from './geo/geo.module';
import { QuotesModule } from './quotes/quotes.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DriversModule } from './drivers/drivers.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    GeoModule,
    QuotesModule,
    OrdersModule,
    NotificationsModule,
    DriversModule,
    AdminModule,
  ],
})
export class AppModule {}
