import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cancelOrder, fetchOrder, type OrderResponse } from '@/api/orders';
import { copy } from '@/copy/uk';
import { formatRouteSummary, formatUah } from '@/format/money';
import { firstParam } from '@/navigation/params';
import { canCancelStatus, isOpenOrderStatus, orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors } from '@/theme';

const POLL_MS = 3000;

export default function CustomerOrderScreen() {
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
    if (!orderId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const next = await authed((token) => fetchOrder(orderId, token));
        if (!cancelled) {
          setOrder(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : copy.requestError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, orderId]);

  useEffect(() => {
    if (!order || !isOpenOrderStatus(order.status)) {
      return;
    }
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, order]);

  async function onCancel() {
    if (!orderId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await authed((token) => cancelOrder(orderId, token));
      setOrder(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.requestError);
    } finally {
      setBusy(false);
    }
  }

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
            <Text style={styles.price}>{formatUah(order.amountKopiyky)}</Text>
            <Text style={styles.meta}>
              {copy.orderIdLabel}: {order.id.slice(0, 8)}
            </Text>
            <Text style={styles.cardTitle}>
              {formatRouteSummary(order.distanceMeters, order.durationSeconds)}
            </Text>
            <Text style={[styles.cardLabel, styles.cardSpacer]}>{copy.pickupLabel}</Text>
            <Text style={styles.cardTitle}>{order.pickup.label}</Text>
            {order.destination ? (
              <>
                <Text style={[styles.cardLabel, styles.cardSpacer]}>
                  {copy.destinationLabel}
                </Text>
                <Text style={styles.cardTitle}>{order.destination.label}</Text>
              </>
            ) : null}
            {order.driver ? (
              <>
                <Text style={[styles.cardLabel, styles.cardSpacer]}>{copy.driverLabel}</Text>
                <Text style={styles.cardTitle}>
                  {order.driver.displayName ?? order.driver.phone ?? '—'}
                </Text>
                {order.driver.plateNumber ? (
                  <Text style={styles.meta}>
                    {copy.vehiclePlate}: {order.driver.plateNumber}
                  </Text>
                ) : null}
              </>
            ) : null}
            <Text style={styles.meta}>
              {copy.createdAtLabel}: {new Date(order.createdAt).toLocaleString('uk-UA')}
            </Text>
          </View>
        ) : null}

        {!orderId || error ? (
          <Text style={styles.error}>{error ?? copy.requestError}</Text>
        ) : null}

        {order && canCancelStatus(order.status) ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => {
              void onCancel();
            }}
          >
            <Text style={styles.secondaryLabel}>
              {busy ? copy.loading : copy.cancelOrder}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => router.replace('/customer')}
        >
          <Text style={styles.primaryLabel}>{copy.backHome}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  brand: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSpacer: {
    marginTop: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  error: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
