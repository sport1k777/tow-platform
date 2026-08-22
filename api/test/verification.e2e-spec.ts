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
import { requiredDocumentsForMarket } from '../src/config/market';
import type { Database } from '../src/db/database.module';
import { DATABASE } from '../src/db/database.tokens';
import {
  driverDocuments,
  driverProfiles,
  driverVehicles,
  userRoles,
  users,
} from '../src/db/schema';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function uniqueUaPhone(): string {
  const nine = String(Math.floor(100_000_000 + Math.random() * 900_000_000));
  return `+380${nine}`;
}

describe('Driver verification (e2e)', () => {
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

  async function driverSession() {
    const phone = uniqueUaPhone();
    const requested = await request(app.getHttpServer()).post('/auth/otp/request').send({ phone });
    const verified = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone, code: requested.body.devCode, role: 'driver' });
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${verified.body.accessToken}`);
    return {
      token: verified.body.accessToken as string,
      userId: me.body.id as string,
      phone,
    };
  }

  async function adminToken() {
    const session = await driverSession();
    await db.insert(userRoles).values({ userId: session.userId, role: 'admin' }).onConflictDoNothing();
    const token = signHs256Jwt(
      { sub: session.userId, roles: ['customer', 'driver', 'admin'] },
      env.JWT_SECRET,
      900,
    );
    return { ...session, token };
  }

  type VerificationBody = {
    verificationStatus: string;
    providerConfigured: boolean;
    documents: Array<{ id?: string; type: string; status: string }>;
  };

  async function waitUntilVerification(
    token: string,
    predicate: (body: VerificationBody) => boolean,
  ): Promise<VerificationBody> {
    const deadline = Date.now() + 10_000;
    let last: VerificationBody | null = null;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get('/drivers/me/verification')
        .set('Authorization', `Bearer ${token}`);
      last = res.body as VerificationBody;
      if (res.status === 200 && predicate(last)) {
        return last;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for document processing: ${JSON.stringify(last)}`);
  }

  it('keeps new drivers incomplete and never auto-approves uploaded documents', async () => {
    const driver = await driverSession();
    const me = await request(app.getHttpServer())
      .get('/drivers/me')
      .set('Authorization', `Bearer ${driver.token}`);
    expect(me.body.verificationStatus).toBe('incomplete');
    expect(me.body.canGoOnline).toBe(false);

    const uploaded = await request(app.getHttpServer())
      .post('/drivers/me/documents')
      .set('Authorization', `Bearer ${driver.token}`)
      .field('type', 'drivers_license')
      .attach('file', PNG_1X1, { filename: 'license.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    const license = uploaded.body.documents.find(
      (doc: { type: string }) => doc.type === 'drivers_license',
    );
    expect(license.status).toBe('processing');
    expect(license.status).not.toBe('approved');
    expect(uploaded.body.verificationStatus).not.toBe('approved');
    expect(uploaded.body.providerConfigured).toBe(false);

    const settled = await waitUntilVerification(driver.token, (body) => {
      const doc = body.documents.find((item) => item.type === 'drivers_license');
      return doc?.status === 'needs_review';
    });
    expect(settled.documents.find((doc) => doc.type === 'drivers_license')?.status).toBe(
      'needs_review',
    );
    expect(settled.verificationStatus).not.toBe('approved');

    const presence = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ online: true, lat: 50.45, lng: 30.52 });
    expect(presence.status).toBe(403);
  });

  it('lets an admin approve documents and the driver only after requirements are met', async () => {
    const driver = await driverSession();
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ firstName: 'Андрій', lastName: 'Коваль' });

    for (const type of requiredDocumentsForMarket()) {
      const uploaded = await request(app.getHttpServer())
        .post('/drivers/me/documents')
        .set('Authorization', `Bearer ${driver.token}`)
        .field('type', type)
        .attach('file', PNG_1X1, { filename: `${type}.png`, contentType: 'image/png' });
      expect(uploaded.status).toBe(201);
      expect(uploaded.body.documents.find((doc: { type: string }) => doc.type === type).status).not.toBe(
        'approved',
      );
    }

    await waitUntilVerification(driver.token, (body) =>
      requiredDocumentsForMarket().every(
        (type) => body.documents.find((doc) => doc.type === type)?.status === 'needs_review',
      ),
    );

    const admin = await adminToken();
    const details = await request(app.getHttpServer())
      .get(`/admin/drivers/${driver.userId}/verification`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(details.status).toBe(200);
    expect(details.body.verificationStatus).toBe('pending_verification');

    const tooSoon = await request(app.getHttpServer())
      .post(`/admin/drivers/${driver.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ verificationStatus: 'approved' });
    expect(tooSoon.status).toBe(400);

    for (const doc of details.body.documents) {
      const approved = await request(app.getHttpServer())
        .post(`/admin/documents/${doc.id}/approve`)
        .set('Authorization', `Bearer ${admin.token}`);
      expect(approved.status).toBe(201);
      expect(approved.body.documents.find((item: { id: string }) => item.id === doc.id).status).toBe(
        'approved',
      );
    }

    const stillNoVehicle = await request(app.getHttpServer())
      .post(`/admin/drivers/${driver.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ verificationStatus: 'approved' });
    expect(stillNoVehicle.status).toBe(400);

    await db.insert(driverVehicles).values({
      driverUserId: driver.userId,
      vehicleCategory: 'car',
      plateNumber: 'AA1111TT',
      services: ['tow'],
      active: true,
      approved: true,
    });

    const approveDriver = await request(app.getHttpServer())
      .post(`/admin/drivers/${driver.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ verificationStatus: 'approved' });
    expect(approveDriver.status).toBe(201);
    expect(approveDriver.body.verificationStatus).toBe('approved');

    const online = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ online: true, lat: 50.45, lng: 30.52 });
    expect(online.status).toBe(201);
    expect(online.body.isOnline).toBe(true);

    const reject = await request(app.getHttpServer())
      .post(`/admin/documents/${details.body.documents[0].id}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'Фотографія документа нечітка' });
    expect(reject.status).toBe(201);
    expect(reject.body.verificationStatus).not.toBe('approved');

    const blocked = await request(app.getHttpServer())
      .post('/drivers/me/presence')
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ online: true, lat: 50.45, lng: 30.52 });
    expect(blocked.status).toBe(403);
  });

  it('requires a reason when rejecting a document', async () => {
    const [user] = await db.insert(users).values({ phone: uniqueUaPhone() }).returning();
    await db.insert(userRoles).values({ userId: user.id, role: 'driver' });
    await db.insert(driverProfiles).values({ userId: user.id, verificationStatus: 'incomplete' });
    const [doc] = await db
      .insert(driverDocuments)
      .values({
        driverUserId: user.id,
        type: 'identity',
        storageKey: `documents/${user.id}.png`,
        mimeType: 'image/png',
        byteSize: 32,
        status: 'needs_review',
      })
      .returning();
    const admin = await adminToken();
    const rejected = await request(app.getHttpServer())
      .post(`/admin/documents/${doc.id}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'ab' });
    expect(rejected.status).toBe(400);
  });
});
