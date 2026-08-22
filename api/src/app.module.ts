import { Module } from '@nestjs/common';

import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { GeoModule } from './geo/geo.module';
import { QuotesModule } from './quotes/quotes.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DriversModule } from './drivers/drivers.module';
import { AdminModule } from './admin/admin.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    DatabaseModule,
    FilesModule,
    HealthModule,
    AuthModule,
    GeoModule,
    QuotesModule,
    OrdersModule,
    NotificationsModule,
    VerificationModule,
    DriversModule,
    AdminModule,
  ],
})
export class AppModule {}
