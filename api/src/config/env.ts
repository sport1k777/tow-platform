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
  SMS_PROVIDER: z.enum(['dev']).default('dev'),
  GEO_PROVIDER: z.enum(['dev', 'osm']).default('dev'),
  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  OSRM_URL: z.string().url().default('https://router.project-osrm.org'),
  GEO_USER_AGENT: z.string().min(1).default('tow-platform/0.1 (phase-4-geo)'),
  NOTIFICATION_PROVIDER: z.enum(['dev']).default('dev'),
  CORS_ORIGINS: z.string().default('*'),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  ORDER_SEARCH_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  OFFER_TTL_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const blockedInProduction: string[] = [];
  if (parsed.data.NODE_ENV === 'production' && parsed.data.SMS_PROVIDER === 'dev') {
    blockedInProduction.push('SMS_PROVIDER=dev');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.NOTIFICATION_PROVIDER === 'dev') {
    blockedInProduction.push('NOTIFICATION_PROVIDER=dev');
  }
  if (blockedInProduction.length > 0) {
    throw new Error(`${blockedInProduction.join(' and ')} cannot be used in production`);
  }

  return parsed.data;
}
