import 'reflect-metadata';
import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';
import { DATABASE_POOL } from '../src/db/database.tokens';

const PHASE5_TABLES = [
  'service_types',
  'pricing_rules',
  'quotes',
  'driver_profiles',
  'driver_vehicles',
  'orders',
  'order_status_history',
  'order_offers',
] as const;

describe('Phase 5 schema (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

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
    pool = app.get(DATABASE_POOL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates Phase 5 tables', async () => {
    const result = await pool.query<{ table_name: string }>(
      `select table_name
         from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
        order by table_name`,
      [PHASE5_TABLES],
    );

    expect(result.rows.map((row) => row.table_name)).toEqual(
      [...PHASE5_TABLES].sort(),
    );
  });

  it('stores pickup points as geography', async () => {
    const result = await pool.query<{ udt_name: string }>(
      `select udt_name
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'quotes'
          and column_name = 'pickup_location'`,
    );

    expect(result.rows[0]?.udt_name).toBe('geography');
  });

  it('seeds service types with destination policy', async () => {
    const result = await pool.query<{
      key: string;
      destination_policy: string;
    }>(
      `select key::text, destination_policy::text
         from service_types
        order by key`,
    );

    expect(result.rows).toEqual([
      { key: 'cargo', destination_policy: 'required' },
      { key: 'moving', destination_policy: 'required' },
      { key: 'roadside', destination_policy: 'optional' },
      { key: 'tow', destination_policy: 'required' },
    ]);
  });

  it('seeds replaceable placeholder pricing rules in kopiyky', async () => {
    const result = await pool.query<{
      service_key: string;
      vehicle_category: string | null;
      base_fee_kopiyky: number;
      per_km_kopiyky: number;
      min_fee_kopiyky: number;
    }>(
      `select service_key::text,
              vehicle_category::text,
              base_fee_kopiyky,
              per_km_kopiyky,
              min_fee_kopiyky
         from pricing_rules
        where active = true
        order by service_key, vehicle_category nulls first`,
    );

    expect(result.rows).toEqual([
      {
        service_key: 'cargo',
        vehicle_category: null,
        base_fee_kopiyky: 90000,
        per_km_kopiyky: 4500,
        min_fee_kopiyky: 90000,
      },
      {
        service_key: 'moving',
        vehicle_category: null,
        base_fee_kopiyky: 80000,
        per_km_kopiyky: 4000,
        min_fee_kopiyky: 80000,
      },
      {
        service_key: 'roadside',
        vehicle_category: null,
        base_fee_kopiyky: 40000,
        per_km_kopiyky: 0,
        min_fee_kopiyky: 40000,
      },
      {
        service_key: 'tow',
        vehicle_category: null,
        base_fee_kopiyky: 50000,
        per_km_kopiyky: 2500,
        min_fee_kopiyky: 50000,
      },
      {
        service_key: 'tow',
        vehicle_category: 'car',
        base_fee_kopiyky: 50000,
        per_km_kopiyky: 2500,
        min_fee_kopiyky: 50000,
      },
      {
        service_key: 'tow',
        vehicle_category: 'motorcycle',
        base_fee_kopiyky: 35000,
        per_km_kopiyky: 2000,
        min_fee_kopiyky: 35000,
      },
      {
        service_key: 'tow',
        vehicle_category: 'suv',
        base_fee_kopiyky: 65000,
        per_km_kopiyky: 3000,
        min_fee_kopiyky: 65000,
      },
      {
        service_key: 'tow',
        vehicle_category: 'van',
        base_fee_kopiyky: 80000,
        per_km_kopiyky: 3500,
        min_fee_kopiyky: 80000,
      },
    ]);
  });

  it('enforces one pending offer per order and per driver', async () => {
    const result = await pool.query<{ indexname: string }>(
      `select indexname
         from pg_indexes
        where schemaname = 'public'
          and tablename = 'order_offers'
          and indexname in (
            'order_offers_one_pending_per_order_idx',
            'order_offers_one_pending_per_driver_idx'
          )
        order by indexname`,
    );

    expect(result.rows.map((row) => row.indexname)).toEqual([
      'order_offers_one_pending_per_driver_idx',
      'order_offers_one_pending_per_order_idx',
    ]);
  });
});
