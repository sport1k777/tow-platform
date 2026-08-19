import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';

import type { AccessPayload } from '../auth/auth.service';
import { loadEnv } from '../config/env';
import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import {
  driverProfiles,
  driverVehicles,
  orderOffers,
  orderStatusHistory,
  orders,
  quotes,
  users,
} from '../db/schema';
import type { CreateOrderDto } from './dto';
import {
  ACTIVE_JOB_STATUSES,
  CUSTOMER_CANCELABLE_STATUSES,
  DRIVER_CANCELABLE_STATUSES,
  assertTransition,
  InvalidOrderTransitionError,
  type OrderStatus,
} from './order-state';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchingService } from '../matching/matching.service';

export type OrderLocation = {
  lat: number;
  lng: number;
  label: string;
};

export type OrderHistoryItem = {
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
};

export type OrderResponse = {
  id: string;
  quoteId: string;
  status: string;
  serviceKey: string;
  vehicleCategory: string | null;
  details: Record<string, unknown>;
  pickup: OrderLocation;
  destination: OrderLocation | null;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: string;
  driverId: string | null;
  driver?: {
    displayName: string | null;
    phone: string | null;
    vehicleCategory: string | null;
    plateNumber: string | null;
  } | null;
  searchExpiresAt: string;
  cancelledBy: string | null;
  createdAt: string;
  history?: OrderHistoryItem[];
};

type OrderRow = {
  id: string;
  quoteId: string;
  customerId: string;
  driverId: string | null;
  serviceKey: string;
  vehicleCategory: string | null;
  details: Record<string, unknown>;
  pickupLabel: string;
  pickupLat: number | string;
  pickupLng: number | string;
  destinationLabel: string | null;
  destinationLat: number | string | null;
  destinationLng: number | string | null;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: string;
  status: string;
  searchExpiresAt: Date;
  cancelledBy: string | null;
  createdAt: Date;
};

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(MatchingService) private readonly matching: MatchingService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async create(user: AccessPayload, body: CreateOrderDto): Promise<OrderResponse> {
    const env = loadEnv();
    const searchExpiresAt = new Date(Date.now() + env.ORDER_SEARCH_TTL_SECONDS * 1000);

    const orderId = await this.db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, body.quoteId))
        .for('update');

      if (!quote || quote.customerId !== user.sub) {
        throw new NotFoundException('Quote not found');
      }
      if (quote.consumedAt) {
        throw new ConflictException('Quote already used');
      }
      if (quote.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Quote has expired');
      }

      const [consumed] = await tx
        .update(quotes)
        .set({ consumedAt: new Date() })
        .where(and(eq(quotes.id, quote.id), isNull(quotes.consumedAt)))
        .returning({ id: quotes.id });
      if (!consumed) {
        throw new ConflictException('Quote already used');
      }

      const [created] = await tx
        .insert(orders)
        .values({
          customerId: quote.customerId,
          quoteId: quote.id,
          serviceKey: quote.serviceKey,
          vehicleCategory: quote.vehicleCategory,
          details: quote.details,
          pickupLabel: quote.pickupLabel,
          pickupLocation: sql`(select pickup_location from quotes where id = ${quote.id})`,
          destinationLabel: quote.destinationLabel,
          destinationLocation: sql`(select destination_location from quotes where id = ${quote.id})`,
          distanceMeters: quote.distanceMeters,
          durationSeconds: quote.durationSeconds,
          pricingRuleId: quote.pricingRuleId,
          amountKopiyky: quote.amountKopiyky,
          currency: quote.currency,
          status: 'searching',
          searchExpiresAt,
        })
        .returning({ id: orders.id });

      await tx.insert(orderStatusHistory).values({
        orderId: created.id,
        fromStatus: null,
        toStatus: 'searching',
        actorUserId: user.sub,
      });

      return created.id;
    });

    await this.refreshLifecycle(orderId);
    return this.loadVisibleOrder(user, orderId, true);
  }

  async listForCustomer(user: AccessPayload): Promise<{ items: OrderResponse[] }> {
    await this.applyLazyExpiry({ customerId: user.sub });
    const searching = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.customerId, user.sub), eq(orders.status, 'searching')));
    for (const row of searching) {
      await this.matching.tryMatch(row.id);
    }
    const rows = await this.db
      .select(this.orderSelect())
      .from(orders)
      .where(eq(orders.customerId, user.sub))
      .orderBy(desc(orders.createdAt));

    return { items: rows.map((row) => this.toResponse(row)) };
  }

  async getById(user: AccessPayload, orderId: string): Promise<OrderResponse> {
    await this.refreshLifecycle(orderId);
    return this.loadVisibleOrder(user, orderId, true);
  }

  async refreshLifecycle(orderId: string): Promise<void> {
    await this.applyLazyExpiry({ orderId });
    await this.matching.tryMatch(orderId);
  }

  async cancel(user: AccessPayload, orderId: string): Promise<OrderResponse> {
    await this.db.transaction(async (tx) => {
      await this.expireOrderInTx(tx, orderId);
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update');
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const cancelledBy = this.cancelledByFor(user, order);
      this.assertTransitionOrConflict(order.status, 'cancelled');

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'cancelled',
          cancelledBy,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
        .returning({ id: orders.id });
      if (!updated) {
        throw new ConflictException('Invalid order status transition');
      }

      await this.expirePendingOffersInTx(tx, orderId);
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: order.status,
        toStatus: 'cancelled',
        actorUserId: user.sub,
        reason: 'cancelled',
      });
    });

    return this.loadVisibleOrder(user, orderId, true);
  }

  async listForDriver(user: AccessPayload): Promise<{ items: OrderResponse[] }> {
    const rows = await this.db
      .select(this.orderSelect())
      .from(orders)
      .where(
        and(
          eq(orders.driverId, user.sub),
          inArray(orders.status, [...ACTIVE_JOB_STATUSES]),
        ),
      )
      .orderBy(desc(orders.createdAt));
    return { items: rows.map((row) => this.toResponse(row)) };
  }

  async progress(
    user: AccessPayload,
    orderId: string,
    toStatus: Extract<OrderStatus, 'driver_en_route' | 'arrived' | 'in_progress'>,
  ): Promise<OrderResponse> {
    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update');
      if (!order || order.driverId !== user.sub) {
        throw new NotFoundException('Order not found');
      }
      this.assertTransitionOrConflict(order.status, toStatus);
      const [updated] = await tx
        .update(orders)
        .set({ status: toStatus, updatedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
        .returning({ id: orders.id });
      if (!updated) {
        throw new ConflictException('Invalid order status transition');
      }
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: order.status,
        toStatus,
        actorUserId: user.sub,
        reason: toStatus,
      });
    });
    const [row] = await this.db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (row) {
      await this.notifications.notify({
        userId: row.customerId,
        title: 'Статус замовлення',
        body: toStatus,
        data: { orderId, status: toStatus },
      });
    }
    return this.loadVisibleOrder(user, orderId, true);
  }

  async complete(user: AccessPayload, orderId: string): Promise<OrderResponse> {
    await this.db.transaction(async (tx) => {
      await this.expireOrderInTx(tx, orderId);
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update');
      if (!order || order.driverId !== user.sub) {
        throw new NotFoundException('Order not found');
      }

      this.assertTransitionOrConflict(order.status, 'completed');

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), inArray(orders.status, ['accepted', 'in_progress'])))
        .returning({ id: orders.id });
      if (!updated) {
        throw new ConflictException('Invalid order status transition');
      }

      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: order.status,
        toStatus: 'completed',
        actorUserId: user.sub,
        reason: 'completed',
      });
      await tx
        .update(driverProfiles)
        .set({
          completedOrdersCount: sql`${driverProfiles.completedOrdersCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(driverProfiles.userId, user.sub));
    });

    return this.loadVisibleOrder(user, orderId, true);
  }

  private cancelledByFor(
    user: AccessPayload,
    order: { customerId: string; driverId: string | null; status: string },
  ): 'customer' | 'driver' {
    if (order.customerId === user.sub) {
      if (!CUSTOMER_CANCELABLE_STATUSES.includes(order.status as OrderStatus)) {
        throw new ConflictException('Invalid order status transition');
      }
      return 'customer';
    }
    if (order.driverId === user.sub) {
      if (!DRIVER_CANCELABLE_STATUSES.includes(order.status as OrderStatus)) {
        throw new ConflictException('Invalid order status transition');
      }
      return 'driver';
    }
    throw new NotFoundException('Order not found');
  }

  private assertTransitionOrConflict(from: string, to: OrderStatus): void {
    try {
      assertTransition(from as OrderStatus, to);
    } catch (error) {
      if (error instanceof InvalidOrderTransitionError) {
        throw new ConflictException('Invalid order status transition');
      }
      throw error;
    }
  }

  private async applyLazyExpiry(
    scope: { orderId: string } | { customerId: string },
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if ('orderId' in scope) {
        await this.expireOrderInTx(tx, scope.orderId);
        return;
      }

      const due = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, scope.customerId),
            inArray(orders.status, ['searching', 'offered']),
          ),
        );
      for (const row of due) {
        await this.expireOrderInTx(tx, row.id);
      }
    });
  }

  private async expireOrderInTx(tx: Tx, orderId: string): Promise<void> {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!order) {
      return;
    }

    const now = new Date();
    const searchable = order.status === 'searching' || order.status === 'offered';
    if (searchable && order.searchExpiresAt.getTime() <= now.getTime()) {
      const [expired] = await tx
        .update(orders)
        .set({ status: 'expired', updatedAt: now })
        .where(
          and(
            eq(orders.id, orderId),
            inArray(orders.status, ['searching', 'offered']),
            lte(orders.searchExpiresAt, now),
          ),
        )
        .returning({ id: orders.id });
      if (expired) {
        await this.expirePendingOffersInTx(tx, orderId);
        await tx.insert(orderStatusHistory).values({
          orderId,
          fromStatus: order.status,
          toStatus: 'expired',
          actorUserId: null,
          reason: 'search_expired',
        });
      }
      return;
    }

    const expiredOffers = await tx
      .update(orderOffers)
      .set({ status: 'expired', resolvedAt: now })
      .where(
        and(
          eq(orderOffers.orderId, orderId),
          eq(orderOffers.status, 'pending'),
          lte(orderOffers.expiresAt, now),
        ),
      )
      .returning({ id: orderOffers.id });

    if (expiredOffers.length === 0 || order.status !== 'offered') {
      return;
    }

    const [reopened] = await tx
      .update(orders)
      .set({ status: 'searching', updatedAt: now })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'offered')))
      .returning({ id: orders.id });
    if (reopened) {
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: 'offered',
        toStatus: 'searching',
        actorUserId: null,
        reason: 'offer_expired',
      });
    }
  }

  private async expirePendingOffersInTx(tx: Tx, orderId: string): Promise<void> {
    await tx
      .update(orderOffers)
      .set({ status: 'expired', resolvedAt: new Date() })
      .where(
        and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, 'pending')),
      );
  }

  private async loadVisibleOrder(
    user: AccessPayload,
    orderId: string,
    includeHistory: boolean,
  ): Promise<OrderResponse> {
    const [row] = await this.db
      .select(this.orderSelect())
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (
      !row ||
      (row.customerId !== user.sub &&
        row.driverId !== user.sub &&
        !user.roles.includes('admin'))
    ) {
      throw new NotFoundException('Order not found');
    }

    if (!includeHistory) {
      const response = this.toResponse(row);
      if (row.driverId) {
        response.driver = await this.loadDriverCard(row.driverId);
      }
      return response;
    }

    const historyRows = await this.db
      .select({
        fromStatus: orderStatusHistory.fromStatus,
        toStatus: orderStatusHistory.toStatus,
        actorUserId: orderStatusHistory.actorUserId,
        reason: orderStatusHistory.reason,
        createdAt: orderStatusHistory.createdAt,
      })
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, row.id))
      .orderBy(orderStatusHistory.createdAt);

    const response = this.toResponse(row, historyRows);
    if (row.driverId) {
      response.driver = await this.loadDriverCard(row.driverId);
    }
    return response;
  }

  private orderSelect() {
    return {
      id: orders.id,
      quoteId: orders.quoteId,
      customerId: orders.customerId,
      driverId: orders.driverId,
      serviceKey: orders.serviceKey,
      vehicleCategory: orders.vehicleCategory,
      details: orders.details,
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
      status: orders.status,
      searchExpiresAt: orders.searchExpiresAt,
      cancelledBy: orders.cancelledBy,
      createdAt: orders.createdAt,
    };
  }

  private toResponse(row: OrderRow, historyRows?: OrderHistoryItem[] | Array<{
    fromStatus: string | null;
    toStatus: string;
    actorUserId: string | null;
    reason: string | null;
    createdAt: Date;
  }>): OrderResponse {
    const destination =
      row.destinationLat == null ||
      row.destinationLng == null ||
      !row.destinationLabel
        ? null
        : {
            lat: Number(row.destinationLat),
            lng: Number(row.destinationLng),
            label: row.destinationLabel,
          };

    return {
      id: row.id,
      quoteId: row.quoteId,
      status: row.status,
      serviceKey: row.serviceKey,
      vehicleCategory: row.vehicleCategory,
      details: row.details,
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
      driverId: row.driverId,
      searchExpiresAt: row.searchExpiresAt.toISOString(),
      cancelledBy: row.cancelledBy,
      createdAt: row.createdAt.toISOString(),
      ...(historyRows
        ? {
            history: historyRows.map((item) => ({
              fromStatus: item.fromStatus,
              toStatus: item.toStatus,
              actorUserId: item.actorUserId,
              reason: item.reason,
              createdAt:
                item.createdAt instanceof Date
                  ? item.createdAt.toISOString()
                  : item.createdAt,
            })),
          }
        : {}),
    };
  }

  private async loadDriverCard(driverId: string) {
    const [person] = await this.db
      .select({
        displayName: users.displayName,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, driverId))
      .limit(1);
    const [vehicle] = await this.db
      .select({
        vehicleCategory: driverVehicles.vehicleCategory,
        plateNumber: driverVehicles.plateNumber,
      })
      .from(driverVehicles)
      .where(eq(driverVehicles.driverUserId, driverId))
      .limit(1);
    return {
      displayName: person?.displayName ?? null,
      phone: person?.phone ?? null,
      vehicleCategory: vehicle?.vehicleCategory ?? null,
      plateNumber: vehicle?.plateNumber ?? null,
    };
  }
}
