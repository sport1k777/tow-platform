import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { progressOrder } from '@/api/drivers';
import { cancelOrder, fetchOrder, type OrderResponse } from '@/api/orders';
import { copy } from '@/copy/uk';
import { formatRouteSummary, formatUah } from '@/format/money';
import { firstParam } from '@/navigation/params';
import { driverCanCancelStatus, orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors } from '@/theme';

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
      setError(caught instanceof Error ? caught.message : copy.requestError);
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
      setError(caught instanceof Error ? caught.message : copy.requestError);
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
      setError(caught instanceof Error ? caught.message : copy.requestError);
    } finally {
      setBusy(false);
    }
  }

  const action = order ? NEXT_ACTION[order.status] : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.orderTitle}</Text>
        <Text style={styles.subtitle}>
          {order ? orderStatusLabel(order.status) : copy.loading}
        </Text>

        {order ? (
          <View style={styles.card}>
            <Text style={styles.meta}>
              {copy.orderIdLabel}: {order.id.slice(0, 8)}
            </Text>
            <Text style={styles.price}>{formatUah(order.amountKopiyky)}</Text>
            <Text style={styles.cardTitle}>
              {formatRouteSummary(order.distanceMeters, order.durationSeconds)}
            </Text>
            <Text style={[styles.cardLabel, styles.spacer]}>{copy.pickupLabel}</Text>
            <Text style={styles.cardTitle}>{order.pickup.label}</Text>
            {order.destination ? (
              <>
                <Text style={[styles.cardLabel, styles.spacer]}>{copy.destinationLabel}</Text>
                <Text style={styles.cardTitle}>{order.destination.label}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {action ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void onProgress()}
          >
            <Text style={styles.primaryLabel}>
              {busy ? copy.loading : ACTION_LABEL[action]}
            </Text>
          </Pressable>
        ) : null}

        {order && driverCanCancelStatus(order.status) ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => void onCancel()}
          >
            <Text style={styles.secondaryLabel}>{copy.cancelOrder}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => router.replace('/driver')}
        >
          <Text style={styles.secondaryLabel}>{copy.backHome}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  brand: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 16, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  spacer: { marginTop: 12 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  price: { color: colors.navy, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.muted, marginBottom: 8 },
  error: { color: colors.accent, marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryLabel: { color: colors.surface, fontSize: 17, fontWeight: '700' },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryLabel: { color: colors.navy, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
