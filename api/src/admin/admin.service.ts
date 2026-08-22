import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import {
  driverProfiles,
  orderStatusEnum,
  orderStatusHistory,
  orders,
  pricingRules,
  userRoles,
  users,
} from '../db/schema';
import {
  assertTransition,
  InvalidOrderTransitionError,
  type OrderStatus,
} from '../orders/order-state';
import { DocumentsService } from '../verification/documents.service';
import { defaultTariffConfig, parseTariffConfig } from '../pricing/types';
import type { AdminDriverStatusDto, AdminOrderStatusDto, AdminPricingDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(DocumentsService) private readonly documents: DocumentsService,
  ) {}

  async stats() {
    const [orderCount] = await this.db.select({ value: count() }).from(orders);
    const [userCount] = await this.db.select({ value: count() }).from(users);
    const [driverCount] = await this.db.select({ value: count() }).from(driverProfiles);
    const byStatus = await this.db
      .select({
        status: orders.status,
        value: count(),
      })
      .from(orders)
      .groupBy(orders.status);
    return {
      users: userCount.value,
      drivers: driverCount.value,
      orders: orderCount.value,
      ordersByStatus: Object.fromEntries(byStatus.map((row) => [row.status, row.value])),
    };
  }

  async listOrders(status?: string) {
    if (status && !(orderStatusEnum.enumValues as readonly string[]).includes(status)) {
      throw new BadRequestException('Unknown order status');
    }
    const rows = await this.db
      .select({
        id: orders.id,
        status: orders.status,
        serviceKey: orders.serviceKey,
        amountKopiyky: orders.amountKopiyky,
        currency: orders.currency,
        customerId: orders.customerId,
        driverId: orders.driverId,
        pickupLabel: orders.pickupLabel,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(status ? eq(orders.status, status as OrderStatus) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(200);
    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async listUsers() {
    const rows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(200);
    const roles = await this.db.select().from(userRoles);
    const roleMap = new Map<string, string[]>();
    for (const row of roles) {
      const list = roleMap.get(row.userId) ?? [];
      list.push(row.role);
      roleMap.set(row.userId, list);
    }
    return {
      items: rows.map((row) => ({
        ...row,
        roles: roleMap.get(row.id) ?? [],
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async listDrivers() {
    const rows = await this.db
      .select({
        userId: driverProfiles.userId,
        phone: users.phone,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarStorageKey: users.avatarStorageKey,
        verificationStatus: driverProfiles.verificationStatus,
        isOnline: driverProfiles.isOnline,
        completedOrdersCount: driverProfiles.completedOrdersCount,
      })
      .from(driverProfiles)
      .innerJoin(users, eq(users.id, driverProfiles.userId))
      .orderBy(desc(driverProfiles.createdAt));
    return {
      items: rows.map((row) => ({
        userId: row.userId,
        phone: row.phone,
        displayName: row.displayName,
        firstName: row.firstName,
        lastName: row.lastName,
        hasAvatar: Boolean(row.avatarStorageKey),
        verificationStatus: row.verificationStatus,
        isOnline: row.isOnline,
        completedOrdersCount: row.completedOrdersCount,
      })),
    };
  }

  async setDriverStatus(actorUserId: string, userId: string, body: AdminDriverStatusDto) {
    return this.documents.setDriverReviewStatus(
      actorUserId,
      userId,
      body.verificationStatus,
      body.reason,
    );
  }

  async listPricing() {
    const items = await this.db
      .select()
      .from(pricingRules)
      .orderBy(desc(pricingRules.validFrom));
    return { items };
  }

  async upsertPricing(body: AdminPricingDto) {
    const cityCode = body.cityCode?.trim() ? body.cityCode.trim() : null;
    const optionKey = body.optionKey?.trim() ? body.optionKey.trim() : null;
    const vehicleCategory = body.vehicleCategory ?? null;
    const config = {
      ...defaultTariffConfig,
      ...parseTariffConfig({
        moverFeeKopiyky: body.moverFeeKopiyky,
        floorFeeKopiyky: body.floorFeeKopiyky,
        noElevatorFeeKopiyky: body.noElevatorFeeKopiyky,
        hourlyFeeKopiyky: body.hourlyFeeKopiyky,
        waitingFeeKopiyky: body.waitingFeeKopiyky,
        outsideCityPerKmKopiyky: body.outsideCityPerKmKopiyky,
      }),
    };

    await this.db
      .update(pricingRules)
      .set({ active: false })
      .where(
        and(
          eq(pricingRules.serviceKey, body.serviceKey),
          cityCode ? eq(pricingRules.cityCode, cityCode) : isNull(pricingRules.cityCode),
          vehicleCategory
            ? eq(pricingRules.vehicleCategory, vehicleCategory)
            : isNull(pricingRules.vehicleCategory),
          optionKey ? eq(pricingRules.optionKey, optionKey) : isNull(pricingRules.optionKey),
          eq(pricingRules.active, true),
        ),
      );

    const [created] = await this.db
      .insert(pricingRules)
      .values({
        serviceKey: body.serviceKey,
        cityCode,
        vehicleCategory,
        optionKey,
        baseFeeKopiyky: body.baseFeeKopiyky,
        perKmKopiyky: body.perKmKopiyky,
        minFeeKopiyky: body.minFeeKopiyky,
        nightMultiplierBps: body.nightMultiplierBps ?? 10_000,
        weekendMultiplierBps: body.weekendMultiplierBps ?? 10_000,
        config,
        active: body.active ?? true,
      })
      .returning();
    return created;
  }

  async getOrder(orderId: string) {
    const [row] = await this.db
      .select({
        id: orders.id,
        status: orders.status,
        serviceKey: orders.serviceKey,
        amountKopiyky: orders.amountKopiyky,
        currency: orders.currency,
        customerId: orders.customerId,
        driverId: orders.driverId,
        pickupLabel: orders.pickupLabel,
        destinationLabel: orders.destinationLabel,
        cancelledBy: orders.cancelledBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Order not found');
    }
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async setOrderStatus(orderId: string, actorUserId: string, body: AdminOrderStatusDto) {
    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update');
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.status === body.status) {
        return;
      }
      try {
        if (body.status === 'cancelled' || body.status === 'expired') {
          const terminal = ['completed', 'cancelled', 'expired'];
          if (terminal.includes(order.status)) {
            throw new InvalidOrderTransitionError(order.status as OrderStatus, body.status);
          }
        } else {
          assertTransition(order.status as OrderStatus, body.status);
        }
      } catch (error) {
        if (error instanceof InvalidOrderTransitionError) {
          throw new ConflictException('Invalid order status transition');
        }
        throw error;
      }

      await tx
        .update(orders)
        .set({
          status: body.status,
          cancelledBy: body.status === 'cancelled' ? 'admin' : order.cancelledBy,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.status, order.status)));
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: order.status,
        toStatus: body.status,
        actorUserId,
        reason: body.reason,
      });
    });
    return this.getOrder(orderId);
  }

  async exportOrdersCsv() {
    const { items } = await this.listOrders();
    const header = 'id,status,service_key,amount_kopiyky,currency,pickup,created_at';
    const lines = items.map((row) =>
      [
        row.id,
        row.status,
        row.serviceKey,
        String(row.amountKopiyky),
        row.currency,
        `"${row.pickupLabel.replaceAll('"', '""')}"`,
        row.createdAt,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}
