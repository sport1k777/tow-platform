import { loadEnv } from '../config/env';
import { DevNotificationProvider } from './dev-notification.provider';
import type { NotificationProvider } from './notification.provider';

export function createNotificationProvider(): NotificationProvider {
  const { NOTIFICATION_PROVIDER } = loadEnv();
  switch (NOTIFICATION_PROVIDER) {
    case 'dev':
      return new DevNotificationProvider();
    default: {
      const unsupported: never = NOTIFICATION_PROVIDER;
      throw new Error(`Unsupported NOTIFICATION_PROVIDER: ${String(unsupported)}`);
    }
  }
}
