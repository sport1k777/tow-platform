import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AccessPayload) {
    return this.notifications.listForUser(user);
  }
}
