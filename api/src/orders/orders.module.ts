import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovedDriverGuard } from '../matching/approved-driver.guard';
import { MatchingService } from '../matching/matching.service';
import { OffersController } from '../matching/offers.controller';
import { OffersService } from '../matching/offers.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, GeoModule, NotificationsModule],
  controllers: [OrdersController, OffersController],
  providers: [OrdersService, MatchingService, OffersService, ApprovedDriverGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
