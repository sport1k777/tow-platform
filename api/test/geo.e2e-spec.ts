import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

describe('Geo (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

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

  it('rejects unauthenticated geo requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/geo/geocode')
      .send({ query: 'Київ' });
    expect(response.status).toBe(401);
  });

  it('geocodes a Ukrainian query', async () => {
    const response = await request(app.getHttpServer())
      .post('/geo/geocode')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: 'Київ' });

    expect(response.status).toBe(201);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].lat).toBeDefined();
    expect(response.body.items[0].lng).toBeDefined();
  });

  it('rejects coordinates outside Ukraine', async () => {
    const response = await request(app.getHttpServer())
      .post('/geo/reverse')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lat: 52.23, lng: 21.01 });

    expect(response.status).toBe(400);
  });

  it('returns a route between two Ukrainian points', async () => {
    const response = await request(app.getHttpServer())
      .post('/geo/route')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        origin: { lat: 50.447, lng: 30.522 },
        destination: { lat: 49.841, lng: 24.032 },
      });

    expect(response.status).toBe(201);
    expect(response.body.distanceMeters).toBeGreaterThan(0);
    expect(response.body.durationSeconds).toBeGreaterThan(0);
    expect(response.body.polyline.length).toBeGreaterThanOrEqual(2);
  });
});
