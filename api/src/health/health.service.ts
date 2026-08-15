import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';

import { market } from '../config/market';
import { DATABASE, DATABASE_POOL } from '../db/database.tokens';
import type { Database } from '../db/database.module';

export type HealthStatus = 'ok' | 'degraded';
export type DatabaseStatus = 'up' | 'down';

export type HealthResult = {
  status: HealthStatus;
  db: DatabaseStatus;
  market: typeof market.countryCode;
  currency: typeof market.currency;
  postgis: boolean;
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async check(): Promise<HealthResult> {
    const dbCheck = await this.checkDatabase();

    return {
      status: dbCheck.ok ? 'ok' : 'degraded',
      db: dbCheck.ok ? 'up' : 'down',
      market: market.countryCode,
      currency: market.currency,
      postgis: dbCheck.postgis,
    };
  }

  async isReady(): Promise<boolean> {
    const dbCheck = await this.checkDatabase();
    return dbCheck.ok && dbCheck.postgis;
  }

  private async checkDatabase(): Promise<{ ok: boolean; postgis: boolean }> {
    try {
      await this.db.execute(sql`select 1`);
      const postgis = await this.pool.query<{ exists: boolean }>(
        `select exists(
           select 1 from pg_extension where extname = 'postgis'
         ) as exists`,
      );
      return { ok: true, postgis: postgis.rows[0]?.exists === true };
    } catch {
      return { ok: false, postgis: false };
    }
  }
}
