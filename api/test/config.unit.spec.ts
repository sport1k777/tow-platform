import { loadEnv } from '../src/config/env';
import { market } from '../src/config/market';

describe('Ukraine market config', () => {
  it('locks the MVP to Ukraine and UAH', () => {
    expect(market).toEqual({
      countryCode: 'UA',
      currency: 'UAH',
      locale: 'uk-UA',
      phoneCountry: 'UA',
      phonePrefix: '+380',
      timezone: 'Europe/Kyiv',
    });
  });
});

describe('loadEnv', () => {
  it('accepts a postgres connection string', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: '3001',
      DATABASE_URL: 'postgresql://tow:tow@localhost:5433/tow_platform',
      JWT_SECRET: 'change-me-in-development-min-32-chars',
    });

    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('test');
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_SECONDS).toBe(2_592_000);
    expect(env.OTP_TTL_SECONDS).toBe(300);
    expect(env.OTP_LENGTH).toBe(6);
    expect(env.OTP_MAX_ATTEMPTS).toBe(5);
    expect(env.SMS_PROVIDER).toBe('dev');
    expect(env.GEO_PROVIDER).toBe('dev');
    expect(env.QUOTE_TTL_SECONDS).toBe(600);
    expect(env.ORDER_SEARCH_TTL_SECONDS).toBe(900);
    expect(env.NOTIFICATION_PROVIDER).toBe('dev');
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://tow:tow@localhost:5433/tow_platform',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects SMS_PROVIDER=dev and GEO_PROVIDER=dev in production', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://tow:tow@localhost:5433/tow_platform',
        JWT_SECRET: 'change-me-in-development-min-32-chars',
      }),
    ).toThrow(/cannot be used in production/);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        PORT: '3000',
      }),
    ).toThrow(/DATABASE_URL/);
  });
});
