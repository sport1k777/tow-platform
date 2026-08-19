export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export type NotificationChannel = 'dev' | 'sms' | 'push' | 'email' | 'whatsapp';

export type NotifyInput = {
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export interface NotificationProvider {
  send(input: NotifyInput): Promise<void>;
}
