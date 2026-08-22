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
import { MockPricingProvider } from '../src/pricing/mock-pricing.provider';
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
const RIVNE = { lat: 50.6199, lng: 26.2516, label: 'вул. Соборна, Рівне' };
const WARSAW = { lat: 52.23, lng: 21.01, label: 'Warsaw' };
const pricing = new MockPricingProvider();

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
    const expected = await pricing.quote({
      serviceKey: 'tow',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: LVIV.label,
      destination: LVIV,
      distanceMeters,
      vehicleCategory: 'car',
      details: { towVehicle: 'car' },
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.serviceKey).toBe('tow');
    expect(response.body.vehicleCategory).toBe('car');
    expect(response.body.distanceMeters).toBe(distanceMeters);
    expect(response.body.amountKopiyky).toBe(expected.breakdown.totalKopiyky);
    expect(response.body.currency).toBe('UAH');
    expect(response.body.pricingRuleId).toBeUndefined();
    expect(response.body.expiresAt).toBeDefined();
    expect(response.body.breakdown.lines.length).toBeGreaterThan(1);
    expect(response.body.breakdown.totalKopiyky).toBe(expected.breakdown.totalKopiyky);
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

  it('quotes roadside pickup-only at the service-specific base', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: KYIV,
        details: { roadsideProblem: 'battery' },
      });

    expect(response.status).toBe(201);
    expect(response.body.distanceMeters).toBe(0);
    expect(response.body.durationSeconds).toBe(0);
    expect(response.body.amountKopiyky).toBe(50_000);
    expect(response.body.destination).toBeNull();
    expect(response.body.pickupSource).toBe('manual_address');
    expect(response.body.pickupLatitude).toBe(KYIV.lat);
    expect(response.body.pickupLongitude).toBe(KYIV.lng);
    expect(response.body.pickupAddress).toBe(KYIV.label);
  });

  it('stores GPS coordinates as the authoritative pickup location', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: { ...KYIV, source: 'current_location' },
        details: { roadsideProblem: 'battery' },
      });

    expect(response.status).toBe(201);
    expect(response.body.pickup.source).toBe('current_location');
    expect(response.body.pickupSource).toBe('current_location');
    expect(response.body.pickupLatitude).toBe(KYIV.lat);
    expect(response.body.pickupLongitude).toBe(KYIV.lng);
    expect(response.body.pickupAddress).toBe(KYIV.label);
  });

  it('accepts a GPS pickup without a street address', async () => {
    const highway = {
      lat: 51.12,
      lng: 26.88,
      label: 'GPS-локація без точної адреси',
      source: 'map_pin',
    };
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: highway,
        details: { roadsideProblem: 'battery' },
      });

    expect(response.status).toBe(201);
    expect(response.body.pickupLatitude).toBe(highway.lat);
    expect(response.body.pickupLongitude).toBe(highway.lng);
    expect(response.body.pickupAddress).toBe(highway.label);
    expect(response.body.pickupSource).toBe('map_pin');
    expect(response.body.pickup.lat).toBe(highway.lat);
    expect(response.body.pickup.lng).toBe(highway.lng);
  });

  it('uses different city tariffs and service models', async () => {
    const kyiv = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: KYIV,
        details: { roadsideProblem: 'battery' },
      });
    const rivne = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'roadside',
        pickup: RIVNE,
        details: { roadsideProblem: 'winch' },
      });
    const moving = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceKey: 'moving',
        pickup: KYIV,
        destination: LVIV,
        details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: true, floor: 1 },
      });

    expect(kyiv.status).toBe(201);
    expect(rivne.status).toBe(201);
    expect(moving.status).toBe(201);
    expect(kyiv.body.amountKopiyky).toBe(50_000);
    expect(rivne.body.amountKopiyky).toBe(127_500);
    expect(moving.body.amountKopiyky).not.toBe(kyiv.body.amountKopiyky);
    expect(moving.body.serviceKey).toBe('moving');
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
