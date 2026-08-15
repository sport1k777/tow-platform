import { Injectable, Logger } from '@nestjs/common';

import { loadEnv } from '../config/env';
import type { SmsProvider } from './sms.provider';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  private readonly logger = new Logger(DevSmsProvider.name);
  private readonly lastCodes = new Map<string, string>();

  async sendOtp(phone: string, code: string): Promise<void> {
    if (loadEnv().NODE_ENV === 'production') {
      throw new Error('Dev SMS provider cannot send messages in production');
    }

    this.lastCodes.set(phone, code);
    this.logger.warn(`Dev OTP for ${phone} generated (not sent via SMS)`);
  }

  getLastCode(phone: string): string | undefined {
    return this.lastCodes.get(phone);
  }
}
