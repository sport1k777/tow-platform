import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { serviceTypes } from '../db/schema';

@Injectable()
export class ServiceTypesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listActive() {
    const rows = await this.db
      .select({
        key: serviceTypes.key,
        destinationPolicy: serviceTypes.destinationPolicy,
      })
      .from(serviceTypes)
      .where(eq(serviceTypes.active, true))
      .orderBy(sql`${serviceTypes.key}::text`);

    return { items: rows };
  }
}
