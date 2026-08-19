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
import { driverProfiles, orderOffers, orders, userRoles, users } from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

const KYIV = { lat: 50.447, lng: 30.522, label: 'Хрещатик, Київ' };
const LVIV = { lat: 49.841, lng: 24.032, label: 'Площа Ринок, Львів' };

describe('Order lifecycle (e2e)', () => {
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

  beforeEach(async () => {
    await db.update(driverProfiles).set({ isOnline: false });
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

  async function createOrder(token = customerToken) {
    const quoted = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        serviceKey: 'tow',
        vehicleCategory: 'car',
        pickup: KYIV,
        destination: LVIV,
      });
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ quoteId: quoted.body.id });
    expect(created.status).toBe(201);
    return created.body as { id: string; status: string };
  }

  async function driverAuth() {
    const env = loadEnv();
    const [driver] = await db
      .insert(users)
      .values({ phone: uniqueUaPhone() })
      .returning();
    await db.insert(userRoles).values({ userId: driver.id, role: 'driver' });
    return {
      driver,
      token: signHs256Jwt(
        { sub: driver.id, roles: ['driver'] },
        env.JWT_SECRET,
        900,
      ),
    };
  }

  it('lets a customer cancel a searching order', async () => {
    const order = await createOrder();
    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelledBy).toBe('customer');
    expect(cancelled.body.history.map((item: { toStatus: string }) => item.toStatus)).toEqual(
      ['searching', 'cancelled'],
    );
  });

  it('lets a customer cancel an offered order', async () => {
    const order = await createOrder();
    await db.update(orders).set({ status: 'offered' }).where(eq(orders.id, order.id));

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('cancelled');
  });

  it('lets a customer cancel an accepted order', async () => {
    const { driver } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({ status: 'accepted', driverId: driver.id })
      .where(eq(orders.id, order.id));

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelledBy).toBe('customer');
  });

  it('lets the assigned driver cancel an accepted order', async () => {
    const { driver, token } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({ status: 'accepted', driverId: driver.id })
      .where(eq(orders.id, order.id));

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelledBy).toBe('driver');
  });

  it('lets the assigned driver complete an accepted order', async () => {
    const { driver, token } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({ status: 'accepted', driverId: driver.id })
      .where(eq(orders.id, order.id));

    const completed = await request(app.getHttpServer())
      .post(`/orders/${order.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(completed.status).toBe(201);
    expect(completed.body.status).toBe('completed');
    expect(
      completed.body.history.map((item: { toStatus: string }) => item.toStatus),
    ).toContain('completed');
  });

  it('rejects customer completion', async () => {
    const order = await createOrder();
    const completed = await request(app.getHttpServer())
      .post(`/orders/${order.id}/complete`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(completed.status).toBe(403);
  });

  it('rejects completing a searching order', async () => {
    const { driver, token } = await driverAuth();
    const order = await createOrder();
    await db.update(orders).set({ driverId: driver.id }).where(eq(orders.id, order.id));

    const completed = await request(app.getHttpServer())
      .post(`/orders/${order.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(completed.status).toBe(409);
  });

  it('rejects cancel after complete', async () => {
    const { driver, token } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({ status: 'accepted', driverId: driver.id })
      .where(eq(orders.id, order.id));
    await request(app.getHttpServer())
      .post(`/orders/${order.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(409);
  });

  it('rejects cancelling another customer’s order', async () => {
    const order = await createOrder(otherCustomerToken);
    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(404);
  });

  it('expires a searching order lazily on GET', async () => {
    const order = await createOrder();
    await db
      .update(orders)
      .set({ searchExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, order.id));

    const got = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(got.status).toBe(200);
    expect(got.body.status).toBe('expired');
    expect(got.body.history.map((item: { toStatus: string }) => item.toStatus)).toEqual(
      ['searching', 'expired'],
    );
  });

  it('expires an offered order when search time has passed, not back to searching', async () => {
    const order = await createOrder();
    await db
      .update(orders)
      .set({
        status: 'offered',
        searchExpiresAt: new Date(Date.now() - 1000),
      })
      .where(eq(orders.id, order.id));

    const got = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(got.status).toBe(200);
    expect(got.body.status).toBe('expired');
  });

  it('returns an offered order to searching when the offer TTL passes', async () => {
    const { driver } = await driverAuth();
    const order = await createOrder();
    await db.update(orders).set({ status: 'offered' }).where(eq(orders.id, order.id));
    await db.insert(orderOffers).values({
      orderId: order.id,
      driverId: driver.id,
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000),
    });

    const got = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(got.status).toBe(200);
    expect(got.body.status).toBe('searching');
    expect(got.body.history.map((item: { reason: string | null }) => item.reason)).toContain(
      'offer_expired',
    );
  });

  it('does not expire an accepted order on search timeout', async () => {
    const { driver } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({
        status: 'accepted',
        driverId: driver.id,
        searchExpiresAt: new Date(Date.now() - 1000),
      })
      .where(eq(orders.id, order.id));

    const got = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(got.status).toBe(200);
    expect(got.body.status).toBe('accepted');
  });

  it('rejects cancel after lazy search expiry', async () => {
    const order = await createOrder();
    await db
      .update(orders)
      .set({ searchExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, order.id));

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelled.status).toBe(409);
  });

  it('expires due searching orders on list', async () => {
    const order = await createOrder();
    await db
      .update(orders)
      .set({ searchExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(orders.id, order.id));

    const listed = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listed.status).toBe(200);
    const found = (listed.body.items as Array<{ id: string; status: string }>).find(
      (item) => item.id === order.id,
    );
    expect(found?.status).toBe('expired');
  });

  it('lets the assigned driver progress accepted → en route → arrived → in progress → completed', async () => {
    const { driver, token } = await driverAuth();
    const order = await createOrder();
    await db
      .update(orders)
      .set({ status: 'accepted', driverId: driver.id })
      .where(eq(orders.id, order.id));

    const enRoute = await request(app.getHttpServer())
      .post(`/orders/${order.id}/en-route`)
      .set('Authorization', `Bearer ${token}`);
    const arrived = await request(app.getHttpServer())
      .post(`/orders/${order.id}/arrive`)
      .set('Authorization', `Bearer ${token}`);
    const started = await request(app.getHttpServer())
      .post(`/orders/${order.id}/start`)
      .set('Authorization', `Bearer ${token}`);
    const completed = await request(app.getHttpServer())
      .post(`/orders/${order.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(enRoute.body.status).toBe('driver_en_route');
    expect(arrived.body.status).toBe('arrived');
    expect(started.body.status).toBe('in_progress');
    expect(completed.body.status).toBe('completed');
  });
});
