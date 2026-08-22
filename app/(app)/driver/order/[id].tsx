import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { progressOrder } from '@/api/drivers';
import { cancelOrder, fetchOrder, type OrderResponse } from '@/api/orders';
import { copy, serviceTitle } from '@/copy/uk';
import { formatRouteSummary, formatUah } from '@/format/money';
import { firstParam } from '@/navigation/params';
import { driverCanCancelStatus, orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  AppText,
  Button,
  Card,
  NavBack,
  Screen,
  StatusBadge,
  orderStatusTone,
  userFacingError,
} from '@/ui';

const NEXT_ACTION: Partial<
  Record<OrderResponse['status'], 'en-route' | 'arrive' | 'start' | 'complete'>
> = {
  accepted: 'en-route',
  driver_en_route: 'arrive',
  arrived: 'start',
  in_progress: 'complete',
};

const ACTION_LABEL = {
  'en-route': copy.markEnRoute,
  arrive: copy.markArrived,
  start: copy.markStart,
  complete: copy.markComplete,
} as const;

export default function DriverOrderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const orderId = firstParam(id);
  const { authed } = useSession();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      return;
    }
    try {
      const next = await authed((token) => fetchOrder(orderId, token));
      setOrder(next);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  }, [authed, orderId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await load();
      }
    })();
    const timer = setInterval(() => {
      void load();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  async function onProgress() {
    if (!orderId || !order) {
      return;
    }
    const action = NEXT_ACTION[order.status];
    if (!action) {
      return;
    }
    setBusy(true);
    try {
      const next = await authed((token) => progressOrder(orderId, action, token));
      setOrder(next);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!orderId) {
      return;
    }
    setBusy(true);
    try {
      const next = await authed((token) => cancelOrder(orderId, token));
      setOrder(next);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const action = order ? NEXT_ACTION[order.status] : undefined;

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          {action ? (
            <Button
              label={ACTION_LABEL[action]}
              loading={busy}
              disabled={busy}
              onPress={() => void onProgress()}
            />
          ) : null}
          {order && driverCanCancelStatus(order.status) ? (
            <Button
              label={copy.cancelOrder}
              variant="danger"
              disabled={busy}
              onPress={() => void onCancel()}
            />
          ) : null}
          <Button
            label={copy.backHome}
            variant="secondary"
            onPress={() => router.replace('/driver')}
          />
        </View>
      }
    >
      <NavBack />
      <AppText variant="hero">{copy.orderTitle}</AppText>
      {order ? (
        <AppText variant="body" color={colors.muted} style={styles.subtitle}>
          {serviceTitle(order.serviceKey)}
        </AppText>
      ) : (
        <AppText variant="body" color={colors.muted} style={styles.subtitle}>
          {copy.loading}
        </AppText>
      )}

      {order ? (
        <Card elevated style={styles.card}>
          <StatusBadge
            label={orderStatusLabel(order.status)}
            tone={orderStatusTone(order.status)}
          />
          <AppText variant="caption" color={colors.muted}>
            {copy.orderIdLabel}: {order.id.slice(0, 8)}
          </AppText>
          <AppText variant="hero" color={colors.accent}>
            {formatUah(order.amountKopiyky)}
          </AppText>
          <AppText variant="card">
            {formatRouteSummary(order.distanceMeters, order.durationSeconds)}
          </AppText>
          <View style={styles.block}>
            <AppText variant="caption" color={colors.muted}>
              {copy.pickupLabel}
            </AppText>
            <AppText variant="card">{order.pickup.label}</AppText>
          </View>
          {order.destination ? (
            <View style={styles.block}>
              <AppText variant="caption" color={colors.muted}>
                {copy.destinationLabel}
              </AppText>
              <AppText variant="card">{order.destination.label}</AppText>
            </View>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
  card: {
    gap: space.md,
  },
  block: {
    gap: 4,
  },
  error: {
    marginTop: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
});
