import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchAdminOrders, setAdminOrderStatus } from '@/api/admin';
import type { OrderStatus } from '@/api/orders';
import { copy, serviceTitle } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  NavBack,
  Screen,
  StatusBadge,
  orderStatusTone,
  userFacingError,
} from '@/ui';

const knownStatus: OrderStatus[] = [
  'searching',
  'offered',
  'accepted',
  'driver_en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
];

function isOrderStatus(value: string): value is OrderStatus {
  return knownStatus.includes(value as OrderStatus);
}

export default function AdminOrdersScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      id: string;
      status: string;
      serviceKey: string;
      amountKopiyky: number;
      pickupLabel: string;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminOrders(token));
      setItems(next.items);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  }, [authed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await load();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <Screen scroll>
      <NavBack />
      <AppText variant="hero">{copy.adminOrders}</AppText>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {items.length === 0 ? <EmptyState title={copy.empty} /> : null}
      <View style={styles.list}>
        {items.map((order) => {
          const status = isOrderStatus(order.status) ? order.status : null;
          return (
            <Card key={order.id} style={styles.card}>
              {status ? (
                <StatusBadge label={orderStatusLabel(status)} tone={orderStatusTone(status)} />
              ) : (
                <AppText variant="card">{order.status}</AppText>
              )}
              <AppText variant="card">{serviceTitle(order.serviceKey)}</AppText>
              <AppText variant="title" color={colors.accent}>
                {formatUah(order.amountKopiyky)}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {order.pickupLabel}
              </AppText>
              <Button
                label={copy.cancelOrder}
                variant="danger"
                onPress={() =>
                  void authed((token) =>
                    setAdminOrderStatus(
                      order.id,
                      { status: 'cancelled', reason: 'admin' },
                      token,
                    ),
                  ).then(() => load())
                }
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: space.md,
  },
  list: {
    marginTop: space.xl,
    gap: space.md,
    paddingBottom: space.xxl,
  },
  card: {
    gap: space.sm,
  },
});
