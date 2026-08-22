import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must be a postgres connection string',
    ),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_REQUEST_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_REQUEST_MAX: z.coerce.number().int().positive().default(3),
  AUTH_OTP_MODE: z.enum(['mock', 'sms']).optional(),
  SMS_PROVIDER: z.enum(['dev']).default('dev'),
  GEO_PROVIDER: z.enum(['dev', 'osm']).default('dev'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PRICING_PROVIDER: z.enum(['mock', 'database']).default('database'),
  MATCHING_DEV_AUTO_ACCEPT: z.enum(['true', 'false']).optional(),
  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  OSRM_URL: z.string().url().default('https://router.project-osrm.org'),
  GEO_USER_AGENT: z.string().min(1).default('tow-platform/0.1 (phase-4-geo)'),
  NOTIFICATION_PROVIDER: z.enum(['dev']).default('dev'),
  CORS_ORIGINS: z.string().default('*'),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  ORDER_SEARCH_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  OFFER_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  VERIFICATION_MODE: z.enum(['manual', 'mock']).default('manual'),
  VERIFICATION_PROVIDER: z.enum(['none', 'manual']).default('none'),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_AVATAR_BYTES: z.coerce.number().int().positive().default(8_388_608),
  MAX_DOCUMENT_BYTES: z.coerce.number().int().positive().default(12_582_912),
});

export type Env = Omit<
  z.infer<typeof envSchema>,
  'AUTH_OTP_MODE' | 'MATCHING_DEV_AUTO_ACCEPT'
> & {
  AUTH_OTP_MODE: 'mock' | 'sms';
  MATCHING_DEV_AUTO_ACCEPT: boolean | undefined;
};

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const otpMode =
    parsed.data.AUTH_OTP_MODE ??
    (parsed.data.NODE_ENV === 'production' ? undefined : 'mock');

  if (parsed.data.NODE_ENV === 'production' && otpMode !== 'sms') {
    throw new Error('AUTH_OTP_MODE=sms is required in production');
  }

  const blockedInProduction: string[] = [];
  if (parsed.data.NODE_ENV === 'production' && otpMode === 'mock') {
    blockedInProduction.push('AUTH_OTP_MODE=mock');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.SMS_PROVIDER === 'dev') {
    blockedInProduction.push('SMS_PROVIDER=dev');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.NOTIFICATION_PROVIDER === 'dev') {
    blockedInProduction.push('NOTIFICATION_PROVIDER=dev');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.VERIFICATION_MODE === 'mock') {
    blockedInProduction.push('VERIFICATION_MODE=mock');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.PAYMENT_PROVIDER === 'mock') {
    blockedInProduction.push('PAYMENT_PROVIDER=mock');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.PRICING_PROVIDER === 'mock') {
    blockedInProduction.push('PRICING_PROVIDER=mock');
  }
  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.MATCHING_DEV_AUTO_ACCEPT === 'true'
  ) {
    blockedInProduction.push('MATCHING_DEV_AUTO_ACCEPT=true');
  }
  if (blockedInProduction.length > 0) {
    throw new Error(`${blockedInProduction.join(' and ')} cannot be used in production`);
  }

  const matchingDevAutoAccept =
    parsed.data.MATCHING_DEV_AUTO_ACCEPT === 'true'
      ? true
      : parsed.data.MATCHING_DEV_AUTO_ACCEPT === 'false'
        ? false
        : undefined;

  return {
    ...parsed.data,
    AUTH_OTP_MODE: otpMode ?? 'mock',
    MATCHING_DEV_AUTO_ACCEPT: matchingDevAutoAccept,
  };
}

export function isMockOtpEnabled(env: Env = loadEnv()): boolean {
  return env.AUTH_OTP_MODE === 'mock' && env.NODE_ENV !== 'production';
}

export function isMockVerificationEnabled(env: Env = loadEnv()): boolean {
  return env.VERIFICATION_MODE === 'mock' && env.NODE_ENV !== 'production';
}

export function isMockPaymentEnabled(env: Env = loadEnv()): boolean {
  return env.PAYMENT_PROVIDER === 'mock' && env.NODE_ENV !== 'production';
}

/** Development-only: auto-accept the first matched seed/fixture driver. Never production. */
export function isDevMatchingAutoAccept(env: Env = loadEnv()): boolean {
  if (env.NODE_ENV === 'production') {
    return false;
  }
  if (env.MATCHING_DEV_AUTO_ACCEPT === false) {
    return false;
  }
  if (env.MATCHING_DEV_AUTO_ACCEPT === true) {
    return true;
  }
  return env.NODE_ENV === 'development' && env.GEO_PROVIDER === 'dev';
}
