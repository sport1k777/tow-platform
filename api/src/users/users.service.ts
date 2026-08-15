import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { userRoles, users } from '../db/schema';

export type UserRecord = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByPhone(phone: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return user;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async createCustomer(phone: string): Promise<UserRecord> {
    const [user] = await this.db.insert(users).values({ phone }).returning();
    await this.db.insert(userRoles).values({
      userId: user.id,
      role: 'customer',
    });
    return user;
  }

  async getRoles(userId: string): Promise<Array<'customer' | 'driver' | 'admin'>> {
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    return rows.map((row) => row.role);
  }
}
