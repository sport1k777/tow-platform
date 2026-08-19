import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { createNotificationProvider } from './create-notification-provider';
import { NOTIFICATION_PROVIDER } from './notification.provider';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_PROVIDER,
      useFactory: createNotificationProvider,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
