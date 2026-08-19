import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, ne, notExists, sql } from 'drizzle-orm';

import { loadEnv } from '../config/env';
import type { Database } from '../db/database.module';
import { DATABASE } from '../db/database.tokens';
import {
  driverProfiles,
  driverVehicles,
  orderOffers,
  orderStatusHistory,
  orders,
  userRoles,
} from '../db/schema';
import { GEO_PROVIDER, type GeoProvider } from '../geo/geo.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { ACTIVE_JOB_STATUSES } from '../orders/order-state';
import { compareScoredDrivers, type ScoredDriver } from './matching.score';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

type Candidate = {
  userId: string;
  lastSeenAt: Date | null;
  lat: number | string | null;
  lng: number | string | null;
};

@Injectable()
export class MatchingService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(GEO_PROVIDER) private readonly geo: GeoProvider,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async tryMatch(orderId: string): Promise<boolean> {
    const offeredDriverId = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update');
      if (!order || order.status !== 'searching') {
        return false;
      }
      if (order.searchExpiresAt.getTime() <= Date.now()) {
        return false;
      }

      const [pickup] = await tx
        .select({
          lat: sql<number>`ST_Y(${orders.pickupLocation}::geometry)`,
          lng: sql<number>`ST_X(${orders.pickupLocation}::geometry)`,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (pickup?.lat == null || pickup?.lng == null) {
        return false;
      }

      const candidates = await this.loadCandidates(tx, order.id, order.customerId, order.serviceKey);
      const scored = await this.scoreCandidates(candidates, {
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      });
      scored.sort(compareScoredDrivers);

      for (const candidate of scored) {
        const offered = await this.tryOffer(tx, order.id, candidate.userId);
        if (offered) {
          return candidate.userId;
        }
      }
      return null;
    });
    if (offeredDriverId) {
      await this.notifications.notify({
        userId: offeredDriverId,
        title: 'Нове замовлення',
        body: 'Надійшла пропозиція замовлення',
        data: { orderId, type: 'offer' },
      });
      return true;
    }
    return false;
  }

  private async loadCandidates(
    tx: Tx,
    orderId: string,
    customerId: string,
    serviceKey: string,
  ): Promise<Candidate[]> {
    const rows = await tx
      .select({
        userId: driverProfiles.userId,
        lastSeenAt: driverProfiles.lastSeenAt,
        lat: sql<number | null>`ST_Y(${driverProfiles.lastLocation}::geometry)`,
        lng: sql<number | null>`ST_X(${driverProfiles.lastLocation}::geometry)`,
      })
      .from(driverProfiles)
      .innerJoin(
        userRoles,
        and(eq(userRoles.userId, driverProfiles.userId), eq(userRoles.role, 'driver')),
      )
      .innerJoin(
        driverVehicles,
        and(
          eq(driverVehicles.driverUserId, driverProfiles.userId),
          eq(driverVehicles.active, true),
        ),
      )
      .where(
        and(
          eq(driverProfiles.verificationStatus, 'approved'),
          eq(driverProfiles.isOnline, true),
          ne(driverProfiles.userId, customerId),
          sql`${serviceKey}::service_key = ANY(${driverVehicles.services})`,
          notExists(
            tx
              .select({ one: sql`1` })
              .from(orderOffers)
              .where(
                and(
                  eq(orderOffers.driverId, driverProfiles.userId),
                  eq(orderOffers.status, 'pending'),
                ),
              ),
          ),
          notExists(
            tx
              .select({ one: sql`1` })
              .from(orders)
              .where(
                and(eq(orders.driverId, driverProfiles.userId), inArray(orders.status, [...ACTIVE_JOB_STATUSES])),
              ),
          ),
          notExists(
            tx
              .select({ one: sql`1` })
              .from(orderOffers)
              .where(
                and(eq(orderOffers.driverId, driverProfiles.userId), eq(orderOffers.orderId, orderId)),
              ),
          ),
        ),
      );

    const unique = new Map<string, Candidate>();
    for (const row of rows) {
      if (!unique.has(row.userId)) {
        unique.set(row.userId, row);
      }
    }
    return [...unique.values()];
  }

  private async scoreCandidates(
    candidates: Candidate[],
    pickup: { lat: number; lng: number },
  ): Promise<ScoredDriver[]> {
    const scored: ScoredDriver[] = [];
    for (const candidate of candidates) {
      let durationSeconds: number | null = null;
      let distanceMeters: number | null = null;
      if (candidate.lat != null && candidate.lng != null) {
        try {
          const route = await this.geo.route(
            { lat: Number(candidate.lat), lng: Number(candidate.lng) },
            pickup,
          );
          durationSeconds = route.durationSeconds;
          distanceMeters = route.distanceMeters;
        } catch {
          durationSeconds = null;
          distanceMeters = null;
        }
      }
      scored.push({
        userId: candidate.userId,
        durationSeconds,
        distanceMeters,
        lastSeenAt: candidate.lastSeenAt,
      });
    }
    return scored;
  }

  private async tryOffer(tx: Tx, orderId: string, driverId: string): Promise<boolean> {
    await tx
      .select({ userId: driverProfiles.userId })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId))
      .for('update');

    const [pending] = await tx
      .select({ id: orderOffers.id })
      .from(orderOffers)
      .where(and(eq(orderOffers.driverId, driverId), eq(orderOffers.status, 'pending')))
      .limit(1);
    if (pending) {
      return false;
    }
    const [busy] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.driverId, driverId), inArray(orders.status, [...ACTIVE_JOB_STATUSES])))
      .limit(1);
    if (busy) {
      return false;
    }

    const env = loadEnv();
    const now = new Date();
    await tx.execute(sql`savepoint offer_insert`);
    try {
      await tx.insert(orderOffers).values({
        orderId,
        driverId,
        status: 'pending',
        expiresAt: new Date(now.getTime() + env.OFFER_TTL_SECONDS * 1000),
      });
      const [updated] = await tx
        .update(orders)
        .set({ status: 'offered', updatedAt: now })
        .where(and(eq(orders.id, orderId), eq(orders.status, 'searching')))
        .returning({ id: orders.id });
      if (!updated) {
        await tx.execute(sql`rollback to savepoint offer_insert`);
        return false;
      }
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: 'searching',
        toStatus: 'offered',
        reason: 'matched',
      });
      await tx.execute(sql`release savepoint offer_insert`);
      return true;
    } catch (error) {
      await tx.execute(sql`rollback to savepoint offer_insert`);
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  const codes: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === 'object'; i += 1) {
    if ('code' in current && typeof current.code === 'string') {
      codes.push(current.code);
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return codes.includes('23505');
}
