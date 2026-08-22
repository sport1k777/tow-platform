import 'reflect-metadata';
import 'dotenv/config';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { loadEnv } from '../config/env';
import { defaultTariffs } from '../pricing/catalog';
import {
  driverProfiles,
  driverVehicles,
  geographyFromLngLat,
  pricingRules,
  schema,
  serviceTypes,
  userRoles,
  users,
} from './schema';

const SEED_USERS = [
  // Local matching fixture only. Production registration never uses these phones
  // or auto-approves a driver.
  {
    phone: '+380501111111',
    displayName: 'Тестовий клієнт',
    roles: ['customer'] as const,
  },
  {
    phone: '+380502222222',
    displayName: 'Тестовий водій',
    roles: ['customer', 'driver'] as const,
    driver: {
      lat: 50.45,
      lng: 30.52,
      plate: 'AA0001TO',
    },
  },
  {
    phone: '+380503333333',
    displayName: 'Водій Львів',
    roles: ['customer', 'driver'] as const,
    driver: {
      lat: 49.84,
      lng: 24.03,
      plate: 'BC1234TT',
    },
  },
  {
    phone: '+380509999999',
    displayName: 'Адмін',
    roles: ['customer', 'admin'] as const,
  },
];

async function upsertUser(
  db: ReturnType<typeof drizzle>,
  input: (typeof SEED_USERS)[number],
) {
  const existing = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
  let userId = existing[0]?.id;
  if (!userId) {
    const [created] = await db
      .insert(users)
      .values({ phone: input.phone, displayName: input.displayName })
      .returning({ id: users.id });
    userId = created.id;
  } else {
    await db
      .update(users)
      .set({ displayName: input.displayName, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  for (const role of input.roles) {
    await db.insert(userRoles).values({ userId, role }).onConflictDoNothing();
  }

  if ('driver' in input && input.driver) {
    await db
      .insert(driverProfiles)
      .values({
        userId,
        verificationStatus: 'approved',
        isOnline: true,
        lastLocation: geographyFromLngLat(input.driver.lng, input.driver.lat),
        lastSeenAt: new Date(),
      })
      .onConflictDoNothing();
    await db
      .update(driverProfiles)
      .set({
        verificationStatus: 'approved',
        isOnline: true,
        lastLocation: geographyFromLngLat(input.driver.lng, input.driver.lat),
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(driverProfiles.userId, userId));

    const [vehicle] = await db
      .select({ id: driverVehicles.id })
      .from(driverVehicles)
      .where(eq(driverVehicles.driverUserId, userId))
      .limit(1);
    if (!vehicle) {
      await db.insert(driverVehicles).values({
        driverUserId: userId,
        vehicleCategory: 'car',
        plateNumber: input.driver.plate,
        capacityKg: 2000,
        services: ['tow', 'roadside', 'moving', 'cargo'],
        active: true,
        approved: true,
      });
    }
  }

  return userId;
}

async function run(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('db:seed is a development fixture and cannot run in production');
  }
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    await db
      .insert(serviceTypes)
      .values([
        { key: 'tow', destinationPolicy: 'required', active: true },
        { key: 'moving', destinationPolicy: 'required', active: true },
        { key: 'cargo', destinationPolicy: 'required', active: true },
        { key: 'roadside', destinationPolicy: 'optional', active: true },
      ])
      .onConflictDoNothing();

    await db.update(pricingRules).set({ active: false });
    await db.insert(pricingRules).values(
      defaultTariffs.map((tariff) => ({
        cityCode: tariff.cityCode,
        serviceKey: tariff.serviceKey,
        vehicleCategory: tariff.vehicleCategory,
        optionKey: tariff.optionKey,
        baseFeeKopiyky: tariff.baseFeeKopiyky,
        perKmKopiyky: tariff.perKmKopiyky,
        minFeeKopiyky: tariff.minFeeKopiyky,
        nightMultiplierBps: tariff.nightMultiplierBps,
        weekendMultiplierBps: tariff.weekendMultiplierBps,
        config: tariff.config,
        active: true,
      })),
    );

    for (const user of SEED_USERS) {
      await upsertUser(db, user);
    }

    console.log('Seed complete. Dev OTP is returned by POST /auth/otp/request in non-production.');
    console.log('Test phones: +380501111111 (customer), +380502222222 (driver), +380509999999 (admin)');
  } finally {
    await pool.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
