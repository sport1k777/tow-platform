import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { signHs256Jwt } from '../src/auth/jwt';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';
import { loadEnv } from '../src/config/env';
import type { Database } from '../src/db/database.module';
import { DATABASE } from '../src/db/database.tokens';
import { orders, quotes, userRoles, users } from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

const KYIV = { lat: 50.447, lng: 30.522, label: 'Хрещатик, Київ' };
const LVIV = { lat: 49.841, lng: 24.032, label: 'Площа Ринок, Львів' };

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let customerToken: string;
  let otherCustomerToken: string;

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

    customerToken = await otpToken(uniqueUaPhone());
    otherCustomerToken = await otpToken(uniqueUaPhone());
  });

  afterAll(async () => {
    await app.close();
  });

  async function otpToken(phone: string): Promise<string> {
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });
    return verified.body.accessToken as string;
  }

  async function createQuote(
    token: string,
    body: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        serviceKey: 'tow',
        vehicleCategory: 'car',
        pickup: KYIV,
        destination: LVIV,
        ...body,
      });
  }

  it('rejects unauthenticated order requests', async () => {
    const created = await request(app.getHttpServer()).post('/orders').send({
      quoteId: '00000000-0000-4000-8000-000000000001',
    });
    const listed = await request(app.getHttpServer()).get('/orders');
    const got = await request(app.getHttpServer()).get(
      '/orders/00000000-0000-4000-8000-000000000001',
    );

    expect(created.status).toBe(401);
    expect(listed.status).toBe(401);
    expect(got.status).toBe(401);
  });

  it('creates an order from a quote with a frozen price snapshot and history', async () => {
    const quoted = await createQuote(customerToken);
    expect(quoted.status).toBe(201);

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    expect(created.status).toBe(201);
    expect(created.body.status).toBe('searching');
    expect(created.body.driverId).toBeNull();
    expect(created.body.quoteId).toBe(quoted.body.id);
    expect(created.body.amountKopiyky).toBe(quoted.body.amountKopiyky);
    expect(created.body.distanceMeters).toBe(quoted.body.distanceMeters);
    expect(created.body.durationSeconds).toBe(quoted.body.durationSeconds);
    expect(created.body.currency).toBe('UAH');
    expect(created.body.pricingRuleId).toBeUndefined();
    expect(created.body.pickup.label).toBe(KYIV.label);
    expect(created.body.pickupLatitude).toBe(KYIV.lat);
    expect(created.body.pickupLongitude).toBe(KYIV.lng);
    expect(created.body.pickupAddress).toBe(KYIV.label);
    expect(created.body.pickupSource).toBe('manual_address');
    expect(created.body.destination.label).toBe(LVIV.label);
    expect(created.body.history).toEqual([
      expect.objectContaining({
        fromStatus: null,
        toStatus: 'searching',
      }),
    ]);
  });

  it('copies the quote snapshot onto the order and does not re-price', async () => {
    const quoted = await createQuote(customerToken);
    const [quoteRow] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoted.body.id));

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, created.body.id));

    expect(created.status).toBe(201);
    expect(orderRow.amountKopiyky).toBe(quoteRow.amountKopiyky);
    expect(orderRow.pricingRuleId).toBe(quoteRow.pricingRuleId);
    expect(orderRow.distanceMeters).toBe(quoteRow.distanceMeters);
    expect(orderRow.durationSeconds).toBe(quoteRow.durationSeconds);
    expect(orderRow.currency).toBe(quoteRow.currency);
    expect(orderRow.pickupLabel).toBe(quoteRow.pickupLabel);
    expect(orderRow.destinationLabel).toBe(quoteRow.destinationLabel);
    expect(created.body.amountKopiyky).toBe(quoteRow.amountKopiyky);
  });

  it('copies GPS pickup coordinates and source from the quote', async () => {
    const quoted = await createQuote(customerToken, {
      pickup: { ...KYIV, source: 'current_location' },
    });
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    expect(quoted.status).toBe(201);
    expect(created.status).toBe(201);
    expect(created.body.pickupLatitude).toBe(KYIV.lat);
    expect(created.body.pickupLongitude).toBe(KYIV.lng);
    expect(created.body.pickupAddress).toBe(KYIV.label);
    expect(created.body.pickupSource).toBe('current_location');
    expect(created.body.pickup.source).toBe('current_location');
  });

  it('rejects quote reuse', async () => {
    const quoted = await createQuote(customerToken);
    const first = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });
    const second = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('rejects an expired quote', async () => {
    const quoted = await createQuote(customerToken);
    await db
      .update(quotes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(quotes.id, quoted.body.id));

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    expect(created.status).toBe(400);
  });

  it('rejects a client-supplied price on order create', async () => {
    const quoted = await createQuote(customerToken);
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id, amountKopiyky: 1 });

    expect(created.status).toBe(400);
  });

  it('lists only the caller’s orders', async () => {
    const ownQuote = await createQuote(customerToken);
    const otherQuote = await createQuote(otherCustomerToken);
    const ownOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: ownQuote.body.id });
    const otherOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ quoteId: otherQuote.body.id });

    const listed = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(ownOrder.status).toBe(201);
    expect(otherOrder.status).toBe(201);
    expect(listed.status).toBe(200);
    const ids = (listed.body.items as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(ownOrder.body.id);
    expect(ids).not.toContain(otherOrder.body.id);
  });

  it('forbids a customer from reading another customer’s order', async () => {
    const quoted = await createQuote(otherCustomerToken);
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ quoteId: quoted.body.id });

    const got = await request(app.getHttpServer())
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(got.status).toBe(404);
  });

  it('forbids using another customer’s quote', async () => {
    const quoted = await createQuote(otherCustomerToken);
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: quoted.body.id });

    expect(created.status).toBe(404);
  });

  it('forbids a driver-only token from creating or listing orders', async () => {
    const env = loadEnv();
    const [user] = await db
      .insert(users)
      .values({ phone: uniqueUaPhone() })
      .returning();
    await db.insert(userRoles).values({ userId: user.id, role: 'driver' });
    const driverToken = signHs256Jwt(
      { sub: user.id, roles: ['driver'] },
      env.JWT_SECRET,
      900,
    );

    const quoted = await createQuote(customerToken);
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ quoteId: quoted.body.id });
    const listed = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(created.status).toBe(403);
    expect(listed.status).toBe(403);
  });

  it('allows an assigned driver to get that order only', async () => {
    const env = loadEnv();
    const [driver] = await db
      .insert(users)
      .values({ phone: uniqueUaPhone() })
      .returning();
    await db.insert(userRoles).values({ userId: driver.id, role: 'driver' });
    const driverToken = signHs256Jwt(
      { sub: driver.id, roles: ['driver'] },
      env.JWT_SECRET,
      900,
    );

    const assignedQuote = await createQuote(customerToken);
    const assigned = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: assignedQuote.body.id });
    const otherQuote = await createQuote(customerToken);
    const other = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quoteId: otherQuote.body.id });

    await db
      .update(orders)
      .set({ driverId: driver.id })
      .where(eq(orders.id, assigned.body.id));

    const own = await request(app.getHttpServer())
      .get(`/orders/${assigned.body.id}`)
      .set('Authorization', `Bearer ${driverToken}`);
    const foreign = await request(app.getHttpServer())
      .get(`/orders/${other.body.id}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(own.status).toBe(200);
    expect(own.body.id).toBe(assigned.body.id);
    expect(own.body.history[0].toStatus).toBe('searching');
    expect(foreign.status).toBe(404);
  });
});
