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

  it('stores pickup_source on quotes and orders', async () => {
    const result = await pool.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name
         from information_schema.columns
        where table_schema = 'public'
          and column_name = 'pickup_source'
          and table_name in ('quotes', 'orders')
        order by table_name`,
    );

    expect(result.rows).toEqual([
      { table_name: 'orders', column_name: 'pickup_source' },
      { table_name: 'quotes', column_name: 'pickup_source' },
    ]);
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

  it('seeds service-specific city tariffs in kopiyky', async () => {
    const result = await pool.query<{
      service_key: string;
      city_code: string | null;
      vehicle_category: string | null;
      option_key: string | null;
      base_fee_kopiyky: number;
    }>(
      `select service_key::text,
              city_code,
              vehicle_category::text,
              option_key,
              base_fee_kopiyky
         from pricing_rules
        where active = true
          and city_code = 'kyiv'
          and (
            (service_key = 'tow' and vehicle_category = 'car' and option_key is null)
            or (service_key = 'moving' and option_key = 'medium' and vehicle_category is null)
            or (service_key = 'cargo' and option_key = 'van' and vehicle_category is null)
            or (service_key = 'roadside' and option_key = 'battery' and vehicle_category is null)
          )
        order by service_key`,
    );

    expect(result.rows).toEqual([
      {
        service_key: 'cargo',
        city_code: 'kyiv',
        vehicle_category: null,
        option_key: 'van',
        base_fee_kopiyky: 90_000,
      },
      {
        service_key: 'moving',
        city_code: 'kyiv',
        vehicle_category: null,
        option_key: 'medium',
        base_fee_kopiyky: 150_000,
      },
      {
        service_key: 'roadside',
        city_code: 'kyiv',
        vehicle_category: null,
        option_key: 'battery',
        base_fee_kopiyky: 50_000,
      },
      {
        service_key: 'tow',
        city_code: 'kyiv',
        vehicle_category: 'car',
        option_key: null,
        base_fee_kopiyky: 80_000,
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
