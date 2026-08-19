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
import {
  driverProfiles,
  driverVehicles,
  geographyFromLngLat,
  orderOffers,
  userRoles,
  users,
} from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

const KYIV = { lat: 50.447, lng: 30.522, label: 'Хрещатик, Київ' };
const LVIV = { lat: 49.841, lng: 24.032, label: 'Площа Ринок, Львів' };
const NEAR_KYIV = { lat: 50.448, lng: 30.523 };

describe('Matching and offers (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let customerToken: string;
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
    db = app.get(DATABASE);
    customerToken = await otpToken(uniqueUaPhone());
  });

  afterEach(async () => {
    await db.update(driverProfiles).set({ isOnline: false });
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
    return created.body as { id: string; status: string; driverId: string | null };
  }

  async function seedDriver(options?: {
    approved?: boolean;
    online?: boolean;
    services?: Array<'tow' | 'moving' | 'cargo' | 'roadside'>;
    location?: { lat: number; lng: number };
    lastSeenAt?: Date;
  }) {
    const [user] = await db.insert(users).values({ phone: uniqueUaPhone() }).returning();
    await db.insert(userRoles).values({ userId: user.id, role: 'driver' });
    await db.insert(driverProfiles).values({
      userId: user.id,
      verificationStatus:
        options?.approved === false ? 'pending_verification' : 'approved',
      isOnline: options?.online !== false,
      lastLocation: options?.location
        ? geographyFromLngLat(options.location.lng, options.location.lat)
        : null,
      lastSeenAt: options?.lastSeenAt ?? new Date(),
    });
    await db.insert(driverVehicles).values({
      driverUserId: user.id,
      vehicleCategory: 'car',
      services: options?.services ?? ['tow'],
      active: true,
    });
    return {
      user,
      token: signHs256Jwt({ sub: user.id, roles: ['driver'] }, env.JWT_SECRET, 900),
    };
  }

  it('keeps the order searching when no eligible driver exists', async () => {
    const order = await createOrder();
    expect(order.status).toBe('searching');
    expect(order.driverId).toBeNull();
  });

  it('creates a pending offer for an approved online driver', async () => {
    const driver = await seedDriver({ location: NEAR_KYIV });
    const order = await createOrder();
    expect(order.status).toBe('offered');

    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${driver.token}`);

    expect(current.status).toBe(200);
    expect(current.body.offer.orderId).toBe(order.id);
    expect(current.body.offer.status).toBe('pending');
    expect(current.body.offer.order.amountKopiyky).toBeGreaterThan(0);
    expect(current.body.offer.order.serviceKey).toBe('tow');
  });

  it('offers to the closer driver first', async () => {
    const far = await seedDriver({ location: LVIV });
    const near = await seedDriver({ location: NEAR_KYIV });
    const order = await createOrder();

    const nearCurrent = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${near.token}`);
    const farCurrent = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${far.token}`);

    expect(nearCurrent.body.offer.orderId).toBe(order.id);
    expect(farCurrent.body.offer).toBeNull();
  });

  it('accepts an offer atomically and is idempotent for the same driver', async () => {
    const driver = await seedDriver({ location: NEAR_KYIV });
    const order = await createOrder();
    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${driver.token}`);

    const first = await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/accept`)
      .set('Authorization', `Bearer ${driver.token}`);
    const second = await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/accept`)
      .set('Authorization', `Bearer ${driver.token}`);

    expect(first.status).toBe(200);
    expect(first.body.id).toBe(order.id);
    expect(first.body.status).toBe('accepted');
    expect(first.body.driverId).toBe(driver.user.id);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.status).toBe('accepted');
  });

  it('rejects a concurrent second accept from another driver', async () => {
    const owner = await seedDriver({ location: NEAR_KYIV });
    const other = await seedDriver({ location: LVIV });
    await createOrder();
    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${owner.token}`);

    const stolen = await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/accept`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(stolen.status).toBe(404);
  });

  it('treats parallel accepts from the owning driver as a single accepted order', async () => {
    const driver = await seedDriver({ location: NEAR_KYIV });
    await createOrder();
    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${driver.token}`);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`/driver/offers/${current.body.offer.id}/accept`)
        .set('Authorization', `Bearer ${driver.token}`),
      request(app.getHttpServer())
        .post(`/driver/offers/${current.body.offer.id}/accept`)
        .set('Authorization', `Bearer ${driver.token}`),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 200]);
    expect(first.body.status).toBe('accepted');
    expect(second.body.status).toBe('accepted');
    expect(first.body.driverId).toBe(driver.user.id);
    expect(second.body.driverId).toBe(driver.user.id);
  });

  it('rejects an offer and matches the next eligible driver', async () => {
    const first = await seedDriver({ location: NEAR_KYIV });
    const second = await seedDriver({ location: LVIV });
    const order = await createOrder();

    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${first.token}`);
    const rejected = await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/reject`)
      .set('Authorization', `Bearer ${first.token}`);

    const next = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${second.token}`);

    expect(rejected.status).toBe(200);
    expect(next.body.offer.orderId).toBe(order.id);
    expect(next.body.offer.id).not.toBe(current.body.offer.id);
  });

  it('forbids unapproved drivers and customers from offer routes', async () => {
    const unapproved = await seedDriver({ approved: true, online: true, location: NEAR_KYIV });
    await db
      .update(driverProfiles)
      .set({ verificationStatus: 'pending_verification' })
      .where(eq(driverProfiles.userId, unapproved.user.id));

    const unapprovedCurrent = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${unapproved.token}`);
    const customerCurrent = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(unapprovedCurrent.status).toBe(403);
    expect(customerCurrent.status).toBe(403);
  });

  it('rejects accept after the offer expires', async () => {
    const driver = await seedDriver({ location: NEAR_KYIV });
    await createOrder();
    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${driver.token}`);

    await db
      .update(orderOffers)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(orderOffers.id, current.body.offer.id));

    const accepted = await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/accept`)
      .set('Authorization', `Bearer ${driver.token}`);

    expect(accepted.status).toBe(409);
  });

  it('does not match a busy driver or a vehicle without the service', async () => {
    const busy = await seedDriver({ location: NEAR_KYIV });
    const firstOrder = await createOrder();
    const current = await request(app.getHttpServer())
      .get('/driver/offers/current')
      .set('Authorization', `Bearer ${busy.token}`);
    await request(app.getHttpServer())
      .post(`/driver/offers/${current.body.offer.id}/accept`)
      .set('Authorization', `Bearer ${busy.token}`);

    await seedDriver({ services: ['roadside'], location: NEAR_KYIV });
    const secondOrder = await createOrder();

    expect(firstOrder.status).toBe('offered');
    expect(secondOrder.status).toBe('searching');
  });
});
