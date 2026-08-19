import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import type { AccessPayload } from '../auth/auth.service';
import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import {
  driverProfiles,
  driverVehicles,
  geographyFromLngLat,
  orders,
  users,
} from '../db/schema';
import { ACTIVE_JOB_STATUSES } from '../orders/order-state';
import type { PresenceDto } from './dto';

export type DriverAvailability = 'offline' | 'online' | 'busy' | 'suspended';

@Injectable()
export class DriversService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getMe(user: AccessPayload) {
    const profile = await this.requireProfile(user.sub);
    const [person] = await this.db
      .select({
        phone: users.phone,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, user.sub))
      .limit(1);
    const vehicles = await this.db
      .select()
      .from(driverVehicles)
      .where(eq(driverVehicles.driverUserId, user.sub));
    const busy = await this.hasActiveJob(user.sub);
    return {
      userId: user.sub,
      phone: person?.phone ?? null,
      displayName: person?.displayName ?? null,
      verificationStatus: profile.verificationStatus,
      isOnline: profile.isOnline,
      availability: this.availability(profile, busy),
      completedOrdersCount: profile.completedOrdersCount,
      rating:
        profile.ratingCount === 0
          ? null
          : Math.round((profile.ratingSum / profile.ratingCount) * 10) / 10,
      lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicleCategory: vehicle.vehicleCategory,
        plateNumber: vehicle.plateNumber,
        capacityKg: vehicle.capacityKg,
        services: vehicle.services,
        active: vehicle.active,
      })),
    };
  }

  async setPresence(user: AccessPayload, body: PresenceDto) {
    const profile = await this.requireProfile(user.sub);
    if (profile.verificationStatus === 'suspended') {
      throw new ForbiddenException('Driver is suspended');
    }
    if (profile.verificationStatus !== 'approved') {
      throw new ForbiddenException('Driver is not approved');
    }

    const online = body.online ?? profile.isOnline;
    const hasCoords = body.lat != null && body.lng != null;
    await this.db
      .update(driverProfiles)
      .set({
        isOnline: online,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
        ...(hasCoords
          ? { lastLocation: geographyFromLngLat(body.lng as number, body.lat as number) }
          : {}),
      })
      .where(eq(driverProfiles.userId, user.sub));

    return this.getMe(user);
  }

  async publicCard(driverId: string) {
    const [row] = await this.db
      .select({
        userId: driverProfiles.userId,
        displayName: users.displayName,
        phone: users.phone,
        verificationStatus: driverProfiles.verificationStatus,
        completedOrdersCount: driverProfiles.completedOrdersCount,
        ratingSum: driverProfiles.ratingSum,
        ratingCount: driverProfiles.ratingCount,
      })
      .from(driverProfiles)
      .innerJoin(users, eq(users.id, driverProfiles.userId))
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Driver not found');
    }
    const [vehicle] = await this.db
      .select()
      .from(driverVehicles)
      .where(and(eq(driverVehicles.driverUserId, driverId), eq(driverVehicles.active, true)))
      .orderBy(desc(driverVehicles.active))
      .limit(1);
    return {
      userId: row.userId,
      displayName: row.displayName,
      phone: row.phone,
      verificationStatus: row.verificationStatus,
      completedOrdersCount: row.completedOrdersCount,
      rating:
        row.ratingCount === 0
          ? null
          : Math.round((row.ratingSum / row.ratingCount) * 10) / 10,
      vehicle: vehicle
        ? {
            vehicleCategory: vehicle.vehicleCategory,
            plateNumber: vehicle.plateNumber,
            capacityKg: vehicle.capacityKg,
            services: vehicle.services,
          }
        : null,
    };
  }

  async hasActiveJob(driverId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.driverId, driverId),
          inArray(orders.status, [...ACTIVE_JOB_STATUSES]),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  private availability(
    profile: { verificationStatus: string; isOnline: boolean },
    busy: boolean,
  ): DriverAvailability {
    if (profile.verificationStatus === 'suspended') {
      return 'suspended';
    }
    if (busy) {
      return 'busy';
    }
    return profile.isOnline ? 'online' : 'offline';
  }

  private async requireProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    return profile;
  }
}
