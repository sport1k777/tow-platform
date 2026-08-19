import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import type { AccessPayload } from '../auth/auth.service';
import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { notifications } from '../db/schema';
import {
  NOTIFICATION_PROVIDER,
  type NotificationChannel,
  type NotificationProvider,
} from './notification.provider';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  async notify(input: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channel?: NotificationChannel;
  }): Promise<void> {
    const channel = input.channel ?? 'dev';
    const [row] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        channel,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        status: 'queued',
      })
      .returning({ id: notifications.id });

    try {
      await this.provider.send({
        userId: input.userId,
        channel,
        title: input.title,
        body: input.body,
        data: input.data,
      });
      await this.db
        .update(notifications)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(notifications.id, row.id));
    } catch {
      await this.db
        .update(notifications)
        .set({ status: 'failed' })
        .where(eq(notifications.id, row.id));
    }
  }

  async listForUser(user: AccessPayload) {
    const items = await this.db
      .select({
        id: notifications.id,
        channel: notifications.channel,
        title: notifications.title,
        body: notifications.body,
        data: notifications.data,
        status: notifications.status,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.sub))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
