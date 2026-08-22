import { loadEnv } from '../config/env';
import { DevSmsProvider } from './dev-sms.provider';
import type { SmsProvider } from './sms.provider';

export function createSmsProvider(): SmsProvider {
  const { SMS_PROVIDER } = loadEnv();

  // AUTH_OTP_MODE=mock skips sendOtp entirely. This adapter is used when
  // AUTH_OTP_MODE=sms. A paid gateway is not wired in this MVP.
  switch (SMS_PROVIDER) {
    case 'dev':
      return new DevSmsProvider();
    default: {
      const unsupported: never = SMS_PROVIDER;
      throw new Error(`Unsupported SMS_PROVIDER: ${String(unsupported)}`);
    }
  }
}
