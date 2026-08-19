import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
  userRoles,
  users,
} from '../src/db/schema';

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

describe('Drivers presence (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets an approved driver go online and offline', async () => {
    const [user] = await db.insert(users).values({ phone: uniqueUaPhone() }).returning();
    await db.insert(userRoles).values({ userId: user.id, role: 'driver' });
    await db.insert(driverProfiles).values({
      userId: user.id,
      verificationStatus: 'approved',
      isOnline: false,
      lastLocation: geographyFromLngLat(30.52, 50.45),
      lastSeenAt: new Date(),
    });
    await db.insert(driverVehicles).values({
      driverUserId: user.id,
      vehicleCategory: 'car',
      plateNumber: 'AA0002TO',
      services: ['tow'],
      active: true,
    });
    const token = signHs256Jwt({ sub: user.id, roles: ['driver'] }, env.JWT_SECRET, 900);

    const online = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${token}`)
      .send({ online: true, lat: 50.45, lng: 30.52 });
    expect(online.status).toBe(201);
    expect(online.body.isOnline).toBe(true);
    expect(online.body.availability).toBe('online');

    const me = await request(app.getHttpServer())
      .get('/drivers/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.vehicles[0].plateNumber).toBe('AA0002TO');

    const offline = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${token}`)
      .send({ online: false });
    expect(offline.body.availability).toBe('offline');
  });

  it('forbids customers from driver presence', async () => {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode });

    const presence = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .send({ online: true });
    expect(presence.status).toBe(403);
  });
});
