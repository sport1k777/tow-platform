import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';
import { loadEnv } from '../src/config/env';
import { haversineMeters } from '../src/geo/dev-geo.provider';
import { calculateAmountKopiyky } from '../src/pricing/pricing.engine';
import { signHs256Jwt } from '../src/auth/jwt';
import { DATABASE } from '../src/db/database.tokens';
import type { Database } from '../src/db/database.module';
import { userRoles, users } from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

const KYIV = { lat: 50.447, lng: 30.522, label: 'Хрещатик, Київ' };
const LVIV = { lat: 49.841, lng: 24.032, label: 'Площа Ринок, Львів' };
const WARSAW = { lat: 52.23, lng: 21.01, label: 'Warsaw' };

describe('Quotes (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
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

    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });
    accessToken = verified.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated quote and service-type requests', async () => {
    const services = await request(app.getHttpServer()).get('/service-types');
    const quote = await request(app.getHttpServer()).post('/quotes').send({
      serviceKey: 'tow',
      pickup: KYIV,
      destination: LVIV,
    });

    expect(services.status).toBe(401);
    expect(quote.status).toBe(401);
  });

  it('lists active service types from the database', async () => {
    const response = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      { key: 'cargo', destinationPolicy: 'required' },
      { key: 'moving', destinationPolicy: 'required' },
      { key: 'roadside', destinationPolicy: 'optional' },
      { key: 'tow', destinationPolicy: 'required' },
    ]);
  });

  it('creates a server-priced tow quote', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'tow',
        vehicleCategory: 'car',
        pickup: KYIV,
        destination: LVIV,
      });

    const distanceMeters = Math.round(haversineMeters(KYIV, LVIV));
    const expectedAmount = calculateAmountKopiyky(distanceMeters, {
      baseFeeKopiyky: 50_000,
      perKmKopiyky: 2_500,
      minFeeKopiyky: 50_000,
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.serviceKey).toBe('tow');
    expect(response.body.vehicleCategory).toBe('car');
    expect(response.body.distanceMeters).toBe(distanceMeters);
    expect(response.body.amountKopiyky).toBe(expectedAmount);
    expect(response.body.currency).toBe('UAH');
    expect(response.body.pricingRuleId).toBeUndefined();
    expect(response.body.expiresAt).toBeDefined();
  });

  it('rejects a client-supplied price', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'tow',
        pickup: KYIV,
        destination: LVIV,
        amountKopiyky: 1,
      });

    expect(response.status).toBe(400);
  });

  it('requires a destination for towing', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'tow',
        pickup: KYIV,
      });

    expect(response.status).toBe(400);
  });

  it('quotes roadside pickup-only at the seeded min fee', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: KYIV,
      });

    expect(response.status).toBe(201);
    expect(response.body.distanceMeters).toBe(0);
    expect(response.body.durationSeconds).toBe(0);
    expect(response.body.amountKopiyky).toBe(40_000);
    expect(response.body.destination).toBeNull();
  });

  it('rejects points outside Ukraine', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'tow',
        pickup: WARSAW,
        destination: KYIV,
      });

    expect(response.status).toBe(400);
  });

  it('forbids a driver-only token from customer quote routes', async () => {
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

    const services = await request(app.getHttpServer())
      .get('/service-types')
      .set('Authorization', `Bearer ${driverToken}`);
    const quote = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: KYIV,
      });

    expect(services.status).toBe(403);
    expect(quote.status).toBe(403);
  });
});
