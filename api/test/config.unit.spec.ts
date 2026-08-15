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
    });

    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('test');
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
