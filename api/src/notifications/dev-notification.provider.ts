import { Logger } from '@nestjs/common';

import type { NotificationProvider, NotifyInput } from './notification.provider';

export class DevNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(DevNotificationProvider.name);

  async send(input: NotifyInput): Promise<void> {
    this.logger.log(
      `[dev notify] user=${input.userId} channel=${input.channel} ${input.title}: ${input.body}`,
    );
  }
}
