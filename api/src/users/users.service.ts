import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { driverProfiles, userRoles, users } from '../db/schema';
import { StorageService } from '../files/storage.service';

export type UserRecord = typeof users.$inferSelect;

export type PublicUser = {
  id: string;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  hasAvatar: boolean;
  roles: Array<'customer' | 'driver' | 'admin'>;
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  toPublic(
    user: UserRecord,
    roles: Array<'customer' | 'driver' | 'admin'>,
  ): PublicUser {
    return {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      hasAvatar: Boolean(user.avatarStorageKey),
      roles,
    };
  }

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

  async createCustomer(phone: string, displayName?: string): Promise<UserRecord> {
    const [user] = await this.db
      .insert(users)
      .values({ phone, displayName: displayName ?? null })
      .returning();
    await this.db.insert(userRoles).values({
      userId: user.id,
      role: 'customer',
    });
    return user;
  }

  async updateProfile(
    userId: string,
    input: { displayName?: string; firstName?: string; lastName?: string },
  ): Promise<UserRecord> {
    const current = await this.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }
    const firstName = input.firstName !== undefined ? input.firstName.trim() : current.firstName;
    const lastName = input.lastName !== undefined ? input.lastName.trim() : current.lastName;
    let displayName = input.displayName !== undefined ? input.displayName.trim() : current.displayName;
    if (input.firstName !== undefined || input.lastName !== undefined) {
      const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
      displayName = combined || displayName;
    }
    if (!input.displayName && input.firstName === undefined && input.lastName === undefined) {
      throw new BadRequestException('At least one profile field is required');
    }
    const [user] = await this.db
      .update(users)
      .set({
        displayName: displayName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateDisplayName(userId: string, displayName: string): Promise<UserRecord> {
    return this.updateProfile(userId, { displayName });
  }

  async setAvatar(userId: string, buffer: Buffer): Promise<UserRecord> {
    const current = await this.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }
    const stored = await this.storage.saveAvatar(buffer);
    const [user] = await this.db
      .update(users)
      .set({ avatarStorageKey: stored.key, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await this.storage.delete(current.avatarStorageKey);
    return user;
  }

  async deleteAvatar(userId: string): Promise<UserRecord> {
    const current = await this.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }
    const [user] = await this.db
      .update(users)
      .set({ avatarStorageKey: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await this.storage.delete(current.avatarStorageKey);
    return user;
  }

  avatarFile(user: UserRecord) {
    if (!user.avatarStorageKey) {
      throw new NotFoundException('Avatar not found');
    }
    return {
      stream: this.storage.openReadStream(user.avatarStorageKey),
      mimeType: this.storage.mimeFromKey(user.avatarStorageKey),
    };
  }

  async addRole(userId: string, role: 'customer' | 'driver' | 'admin'): Promise<void> {
    await this.db
      .insert(userRoles)
      .values({ userId, role })
      .onConflictDoNothing();
  }

  async ensureDriverProfile(userId: string): Promise<void> {
    await this.db
      .insert(driverProfiles)
      .values({ userId, verificationStatus: 'incomplete' })
      .onConflictDoNothing();
  }

  async getRoles(userId: string): Promise<Array<'customer' | 'driver' | 'admin'>> {
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    return rows.map((row) => row.role);
  }
}
