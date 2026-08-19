import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';

import type { AccessPayload } from '../auth/auth.service';
import type { Database } from '../db/database.module';
import { DATABASE } from '../db/database.tokens';
import { orderOffers, orderStatusHistory, orders } from '../db/schema';
import type { OrderResponse } from '../orders/orders.service';
import { OrdersService } from '../orders/orders.service';
import { MatchingService } from './matching.service';

export type DriverOfferResponse = {
  id: string;
  orderId: string;
  status: 'pending';
  expiresAt: string;
  order: {
    serviceKey: string;
    vehicleCategory: string | null;
    pickup: { lat: number; lng: number; label: string };
    destination: { lat: number; lng: number; label: string } | null;
    distanceMeters: number;
    durationSeconds: number;
    amountKopiyky: number;
    currency: string;
  };
};

@Injectable()
export class OffersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(MatchingService) private readonly matching: MatchingService,
  ) {}

  async current(user: AccessPayload): Promise<{ offer: DriverOfferResponse | null }> {
    const [existing] = await this.db
      .select({ id: orderOffers.id, orderId: orderOffers.orderId })
      .from(orderOffers)
      .where(and(eq(orderOffers.driverId, user.sub), eq(orderOffers.status, 'pending')))
      .limit(1);

    if (existing) {
      await this.ordersService.refreshLifecycle(existing.orderId);
    }

    const offer = await this.loadPendingOffer(user.sub);
    return { offer };
  }

  async accept(user: AccessPayload, offerId: string): Promise<OrderResponse> {
    const preview = await this.requireOwnedOffer(user.sub, offerId);
    await this.ordersService.refreshLifecycle(preview.orderId);

    const orderId = await this.db.transaction(async (tx) => {
      const now = new Date();
      const [acceptedOffer] = await tx
        .update(orderOffers)
        .set({ status: 'accepted', resolvedAt: now })
        .where(
          and(
            eq(orderOffers.id, offerId),
            eq(orderOffers.driverId, user.sub),
            eq(orderOffers.status, 'pending'),
            gt(orderOffers.expiresAt, now),
          ),
        )
        .returning({ id: orderOffers.id, orderId: orderOffers.orderId });

      if (acceptedOffer) {
        const [locked] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, acceptedOffer.orderId))
          .for('update');
        if (!locked) {
          throw new ConflictException('Offer is no longer available');
        }
        const [acceptedOrder] = await tx
          .update(orders)
          .set({
            status: 'accepted',
            driverId: user.sub,
            updatedAt: now,
          })
          .where(and(eq(orders.id, acceptedOffer.orderId), eq(orders.status, 'offered')))
          .returning({ id: orders.id });
        if (!acceptedOrder) {
          throw new ConflictException('Offer is no longer available');
        }
        await tx.insert(orderStatusHistory).values({
          orderId: acceptedOffer.orderId,
          fromStatus: 'offered',
          toStatus: 'accepted',
          actorUserId: user.sub,
          reason: 'accepted',
        });
        return acceptedOffer.orderId;
      }

      const [existing] = await tx
        .select({
          status: orderOffers.status,
          orderId: orderOffers.orderId,
          driverId: orderOffers.driverId,
        })
        .from(orderOffers)
        .where(and(eq(orderOffers.id, offerId), eq(orderOffers.driverId, user.sub)))
        .limit(1);
      if (!existing) {
        throw new NotFoundException('Offer not found');
      }
      const [order] = await tx
        .select({ status: orders.status, driverId: orders.driverId })
        .from(orders)
        .where(eq(orders.id, existing.orderId))
        .limit(1);
      if (
        existing.status === 'accepted' &&
        order?.status === 'accepted' &&
        order.driverId === user.sub
      ) {
        return existing.orderId;
      }
      throw new ConflictException('Offer is no longer available');
    });

    return this.ordersService.getById(user, orderId);
  }

  async reject(user: AccessPayload, offerId: string): Promise<{ ok: true }> {
    const preview = await this.requireOwnedOffer(user.sub, offerId);
    await this.ordersService.refreshLifecycle(preview.orderId);

    const orderId = await this.db.transaction(async (tx) => {
      const now = new Date();
      const [rejected] = await tx
        .update(orderOffers)
        .set({ status: 'rejected', resolvedAt: now })
        .where(
          and(
            eq(orderOffers.id, offerId),
            eq(orderOffers.driverId, user.sub),
            eq(orderOffers.status, 'pending'),
          ),
        )
        .returning({ id: orderOffers.id, orderId: orderOffers.orderId });
      if (!rejected) {
        throw new ConflictException('Offer is no longer available');
      }

      const [reopened] = await tx
        .update(orders)
        .set({ status: 'searching', updatedAt: now })
        .where(and(eq(orders.id, rejected.orderId), eq(orders.status, 'offered')))
        .returning({ id: orders.id });
      if (reopened) {
        await tx.insert(orderStatusHistory).values({
          orderId: rejected.orderId,
          fromStatus: 'offered',
          toStatus: 'searching',
          actorUserId: user.sub,
          reason: 'rejected',
        });
      }
      return rejected.orderId;
    });

    await this.matching.tryMatch(orderId);
    return { ok: true };
  }

  private async requireOwnedOffer(driverId: string, offerId: string) {
    const [offer] = await this.db
      .select({
        id: orderOffers.id,
        orderId: orderOffers.orderId,
        driverId: orderOffers.driverId,
      })
      .from(orderOffers)
      .where(eq(orderOffers.id, offerId))
      .limit(1);
    if (!offer || offer.driverId !== driverId) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  private async loadPendingOffer(driverId: string): Promise<DriverOfferResponse | null> {
    const [row] = await this.db
      .select({
        id: orderOffers.id,
        orderId: orderOffers.orderId,
        expiresAt: orderOffers.expiresAt,
        serviceKey: orders.serviceKey,
        vehicleCategory: orders.vehicleCategory,
        pickupLabel: orders.pickupLabel,
        pickupLat: sql<number>`ST_Y(${orders.pickupLocation}::geometry)`,
        pickupLng: sql<number>`ST_X(${orders.pickupLocation}::geometry)`,
        destinationLabel: orders.destinationLabel,
        destinationLat: sql<number | null>`ST_Y(${orders.destinationLocation}::geometry)`,
        destinationLng: sql<number | null>`ST_X(${orders.destinationLocation}::geometry)`,
        distanceMeters: orders.distanceMeters,
        durationSeconds: orders.durationSeconds,
        amountKopiyky: orders.amountKopiyky,
        currency: orders.currency,
      })
      .from(orderOffers)
      .innerJoin(orders, eq(orders.id, orderOffers.orderId))
      .where(
        and(
          eq(orderOffers.driverId, driverId),
          eq(orderOffers.status, 'pending'),
          gt(orderOffers.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const destination =
      row.destinationLat == null || row.destinationLng == null || !row.destinationLabel
        ? null
        : {
            lat: Number(row.destinationLat),
            lng: Number(row.destinationLng),
            label: row.destinationLabel,
          };

    return {
      id: row.id,
      orderId: row.orderId,
      status: 'pending',
      expiresAt: row.expiresAt.toISOString(),
      order: {
        serviceKey: row.serviceKey,
        vehicleCategory: row.vehicleCategory,
        pickup: {
          lat: Number(row.pickupLat),
          lng: Number(row.pickupLng),
          label: row.pickupLabel,
        },
        destination,
        distanceMeters: row.distanceMeters,
        durationSeconds: row.durationSeconds,
        amountKopiyky: row.amountKopiyky,
        currency: row.currency,
      },
    };
  }
}
