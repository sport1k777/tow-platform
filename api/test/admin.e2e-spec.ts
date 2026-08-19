import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';
import type { Database } from '../src/db/database.module';
import { DATABASE } from '../src/db/database.tokens';
import { pricingRules, userRoles } from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

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
    db = app.get(DATABASE);
  });

  afterAll(async () => {
    await app.close();
  });

  async function otpSession() {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${verified.body.accessToken}`);
    return {
      token: verified.body.accessToken as string,
      refreshToken: verified.body.refreshToken as string,
      userId: me.body.id as string,
    };
  }

  it('forbids customers from admin endpoints', async () => {
    const customer = await otpSession();
    const stats = await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(stats.status).toBe(403);
  });

  it('lets an admin read stats, list orders, and configure pricing', async () => {
    const admin = await otpSession();
    await db.insert(userRoles).values({ userId: admin.userId, role: 'admin' });
    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: admin.refreshToken });
    expect(rotated.status).toBe(201);
    const token = rotated.body.accessToken as string;

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.body.canUseAdminMode).toBe(true);

    const stats = await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(stats.status).toBe(200);
    expect(typeof stats.body.users).toBe('number');
    expect(typeof stats.body.orders).toBe('number');

    const orders = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(orders.status).toBe(200);
    expect(Array.isArray(orders.body.items)).toBe(true);

    const drivers = await request(app.getHttpServer())
      .get('/admin/drivers')
      .set('Authorization', `Bearer ${token}`);
    expect(drivers.status).toBe(200);

    const pricing = await request(app.getHttpServer())
      .post('/admin/pricing')
      .set('Authorization', `Bearer ${token}`)
      .send({
        serviceKey: 'roadside',
        vehicleCategory: 'motorcycle',
        baseFeeKopiyky: 41_000,
        perKmKopiyky: 0,
        minFeeKopiyky: 41_000,
        active: true,
      });
    expect(pricing.status).toBe(201);
    expect(pricing.body.minFeeKopiyky).toBe(41_000);
    await db
      .update(pricingRules)
      .set({ active: false })
      .where(eq(pricingRules.id, pricing.body.id));

    const exported = await request(app.getHttpServer())
      .get('/admin/orders/export')
      .set('Authorization', `Bearer ${token}`);
    expect(exported.status).toBe(200);
    expect(exported.body.csv).toContain('id,status,service_key');
  });
});
