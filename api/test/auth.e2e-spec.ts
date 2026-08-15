import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';
import { loadEnv } from '../src/config/env';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const env = loadEnv();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects non-Ukrainian numbers', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: '+48123456789' });

    expect(response.status).toBe(400);
  });

  it('rejects missing access tokens on /me', async () => {
    const response = await request(app.getHttpServer()).get('/me');
    expect(response.status).toBe(401);
  });

  it('verifies OTP, issues customer session, and blocks driver mode', async () => {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });

    expect(requested.status).toBe(201);
    expect(requested.body.devCode).toHaveLength(env.OTP_LENGTH);

    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });

    expect(verified.status).toBe(201);
    expect(verified.body.accessToken).toBeDefined();
    expect(verified.body.refreshToken).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${verified.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.phone).toBe(phone);
    expect(me.body.roles).toEqual(['customer']);
    expect(me.body.canUseDriverMode).toBe(false);

    const reusedCode = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });
    expect(reusedCode.status).toBe(401);
  });

  it('invalidates the previous OTP when a new one is requested', async () => {
    const phone = uniqueUaPhone();
    const first = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const second = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.devCode).toBeDefined();

    const oldCode = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: first.body.devCode });
    expect(oldCode.status).toBe(401);

    const newCode = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: second.body.devCode });
    expect(newCode.status).toBe(201);
    expect(newCode.body.accessToken).toBeDefined();
  });

  it('rotates refresh tokens and rejects the previous one', async () => {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verified.body.refreshToken });

    expect(rotated.status).toBe(201);
    expect(rotated.body.refreshToken).not.toBe(verified.body.refreshToken);

    const reused = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verified.body.refreshToken });

    expect(reused.status).toBe(401);
  });

  it('revokes refresh tokens on logout', async () => {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .send({ refreshToken: verified.body.refreshToken });

    expect(logout.status).toBe(201);

    const reused = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verified.body.refreshToken });

    expect(reused.status).toBe(401);
  });

  it('expires OTP and enforces attempt limits', async () => {
    const previousTtl = process.env.OTP_TTL_SECONDS;
    process.env.OTP_TTL_SECONDS = '1';
    const limitedPhone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: limitedPhone });

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const expired = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: limitedPhone, code: requested.body.devCode });
    expect(expired.status).toBe(401);

    if (previousTtl === undefined) {
      delete process.env.OTP_TTL_SECONDS;
    } else {
      process.env.OTP_TTL_SECONDS = previousTtl;
    }

    const attemptsPhone = uniqueUaPhone();
    const second = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: attemptsPhone });

    for (let i = 0; i < env.OTP_MAX_ATTEMPTS - 1; i += 1) {
      const failed = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ phone: attemptsPhone, code: '000000' });
      expect(failed.status).toBe(401);
    }

    const locked = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: attemptsPhone, code: '000000' });
    expect(locked.status).toBe(429);

    const afterLock = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: attemptsPhone, code: second.body.devCode });
    expect(afterLock.status).toBe(429);
  });
});
