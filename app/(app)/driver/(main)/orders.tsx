import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  acceptOffer,
  fetchCurrentOffer,
  fetchDriverMe,
  fetchDriverOrders,
  rejectOffer,
  type DriverOffer,
} from '@/api/drivers';
import type { OrderResponse } from '@/api/orders';
import { copy, serviceTitle } from '@/copy/uk';
import { isApprovedDriver } from '@/drivers/verification';
import { formatRouteSummary, formatUah } from '@/format/money';
import { orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  PressScale,
  Screen,
  StatusBadge,
  orderStatusTone,
  userFacingError,
} from '@/ui';

export default function DriverOrdersScreen() {
  const { authed } = useSession();
  const [offer, setOffer] = useState<DriverOffer | null>(null);
  const [items, setItems] = useState<OrderResponse[]>([]);
  const [approved, setApproved] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await authed((token) => fetchDriverMe(token));
      const ok = isApprovedDriver(profile.verificationStatus);
      setApproved(ok);
      setOnline(profile.isOnline);
      if (!ok) {
        setOffer(null);
        setItems([]);
        setError(null);
        return;
      }
      const [current, orders] = await Promise.all([
        authed((token) => fetchCurrentOffer(token)),
        authed((token) => fetchDriverOrders(token)),
      ]);
      setOffer(current.offer);
      setItems(orders.items);
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
    const timer = setInterval(() => {
      void load();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  return (
    <Screen scroll embedInTabs>
      <AppText variant="hero">{copy.myOrders}</AppText>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      {offer ? (
        <Card elevated style={styles.card}>
          <AppText variant="card">{serviceTitle(offer.order.serviceKey)}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {formatRouteSummary(offer.order.distanceMeters, offer.order.durationSeconds)}
          </AppText>
          <AppText variant="body">{offer.order.pickup.label}</AppText>
          {offer.order.destination ? (
            <AppText variant="caption" color={colors.secondary}>
              {offer.order.destination.label}
            </AppText>
          ) : null}
          <AppText variant="hero" color={colors.accent}>
            {formatUah(offer.order.amountKopiyky)}
          </AppText>
          <View style={styles.actions}>
            <Button
              label={copy.acceptOffer}
              onPress={() =>
                void authed((token) => acceptOffer(offer.id, token)).then((order) => {
                  router.push({
                    pathname: '/driver/order/[id]',
                    params: { id: order.id },
                  });
                })
              }
            />
            <Button
              label={copy.rejectOffer}
              variant="secondary"
              onPress={() =>
                void authed((token) => rejectOffer(offer.id, token)).then(() => load())
              }
            />
          </View>
        </Card>
      ) : (
        <EmptyState
          title={approved ? (online ? copy.noOffersTitle : copy.offlineTitle) : copy.verificationScreen}
          hint={approved ? (online ? copy.noOffers : copy.goOnlineHint) : copy.driverPendingHint}
          icon="orders"
        />
      )}

      {items.map((order) => (
        <PressScale
          key={order.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/driver/order/[id]',
              params: { id: order.id },
            })
          }
          style={styles.active}
        >
          <StatusBadge label={orderStatusLabel(order.status)} tone={orderStatusTone(order.status)} />
          <AppText variant="card">{serviceTitle(order.serviceKey)}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {order.pickup.label}
          </AppText>
          <AppText variant="title" color={colors.accent}>
            {formatUah(order.amountKopiyky)}
          </AppText>
        </PressScale>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: space.md,
  },
  card: {
    marginTop: space.xl,
    gap: space.sm,
  },
  actions: {
    marginTop: space.md,
    gap: space.sm,
  },
  active: {
    marginTop: space.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: space.lg,
    gap: space.sm,
  },
});
