import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { cancelOrder, fetchOrder, type OrderResponse } from '@/api/orders';
import { copy, paymentMethodLabel, paymentStatusLabel, serviceTitle } from '@/copy/uk';
import { formatRouteSummary, formatUah } from '@/format/money';
import { darkMapStyle } from '@/maps/darkStyle';
import { regionForPlaces } from '@/maps/region';
import { firstParam } from '@/navigation/params';
import { canCancelStatus, isOpenOrderStatus, orderStatusLabel } from '@/orders/status';
import { parsePaymentRecord } from '@/payments/types';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  AppText,
  Button,
  Card,
  DriverCard,
  NavBack,
  OrderTimeline,
  PulseRing,
  Screen,
  StatusBadge,
  orderStatusTone,
  userFacingError,
} from '@/ui';

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
      setError(userFacingError(caught));
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
          setError(userFacingError(caught));
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
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const searching = order?.status === 'searching' || order?.status === 'offered';
  const found = Boolean(order?.driver) && !searching;
  const payment = order ? parsePaymentRecord(order.details) : null;
  const region = useMemo(
    () =>
      regionForPlaces(
        order
          ? [order.pickup, order.destination].filter(
              (point): point is NonNullable<typeof point> => point != null,
            )
          : [],
      ),
    [order],
  );

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          {order && canCancelStatus(order.status) ? (
            <Button
              label={searching ? copy.cancelSearch : copy.cancelOrder}
              variant="danger"
              disabled={busy}
              loading={busy}
              onPress={() => void onCancel()}
            />
          ) : null}
          <Button
            label={copy.backHome}
            variant="secondary"
            onPress={() => router.replace('/customer')}
          />
        </View>
      }
    >
      <NavBack />
      <AppText variant="hero">
        {searching ? copy.searchingDriver : found ? copy.driverFoundTitle : copy.orderTitle}
      </AppText>
      <AppText variant="body" color={colors.secondary} style={styles.subtitle}>
        {searching
          ? copy.searchingHint
          : found
            ? copy.driverOnTheWay
            : order
              ? serviceTitle(order.serviceKey)
              : copy.loading}
      </AppText>
      {order?.history?.some((item) => item.reason === 'dev_auto_accept') ? (
        <AppText variant="caption" color={colors.warning} style={styles.devBanner}>
          {copy.devMatchingBanner}
        </AppText>
      ) : null}
      {payment?.mock ? (
        <AppText variant="caption" color={colors.warning} style={styles.devBanner}>
          {copy.paymentMockBanner}
        </AppText>
      ) : null}

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          region={region}
          userInterfaceStyle="dark"
          customMapStyle={darkMapStyle}
        >
          {order ? (
            <Marker
              coordinate={{ latitude: order.pickup.lat, longitude: order.pickup.lng }}
              pinColor={colors.accent}
              title={copy.pickupLabel}
            />
          ) : null}
          {order?.destination ? (
            <Marker
              coordinate={{ latitude: order.destination.lat, longitude: order.destination.lng }}
              pinColor={colors.text}
              title={copy.destinationLabel}
            />
          ) : null}
        </MapView>
        {searching ? (
          <View style={styles.pulse} pointerEvents="none">
            <PulseRing size={120} />
          </View>
        ) : null}
      </View>

      {order ? (
        <Card style={styles.block}>
          <StatusBadge
            label={orderStatusLabel(order.status)}
            tone={orderStatusTone(order.status)}
          />
          <AppText variant="hero" color={colors.accent}>
            {formatUah(order.amountKopiyky)}
          </AppText>
          <AppText variant="caption" color={colors.secondary}>
            {formatRouteSummary(order.distanceMeters, order.durationSeconds)}
          </AppText>
          <OrderTimeline status={order.status} />
        </Card>
      ) : null}

      {order?.driver ? (
        <View style={styles.block}>
          <DriverCard
            name={order.driver.displayName ?? order.driver.phone ?? copy.driverLabel}
            vehicle={order.driver.vehicleCategory}
            plate={order.driver.plateNumber}
            distance={formatRouteSummary(order.distanceMeters, order.durationSeconds)}
            phone={order.driver.phone}
          />
        </View>
      ) : null}

      {order ? (
        <Card style={styles.block}>
          <AppText variant="caption" color={colors.secondary}>
            {copy.pickupLabel}
          </AppText>
          <AppText variant="card">{order.pickup.label}</AppText>
          {order.destination ? (
            <View style={styles.spacer}>
              <AppText variant="caption" color={colors.secondary}>
                {copy.destinationLabel}
              </AppText>
              <AppText variant="card">{order.destination.label}</AppText>
            </View>
          ) : null}
          {payment ? (
            <View style={styles.spacer}>
              <AppText variant="caption" color={colors.secondary}>
                {copy.paymentTitle}
              </AppText>
              <AppText variant="card">
                {paymentMethodLabel(payment.method)} · {paymentStatusLabel(payment.status)}
              </AppText>
            </View>
          ) : null}
        </Card>
      ) : null}

      {!orderId || error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error ?? copy.requestError}
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
  devBanner: {
    marginTop: -space.md,
    marginBottom: space.lg,
  },
  mapCard: {
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  map: {
    flex: 1,
  },
  pulse: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    marginBottom: space.md,
    gap: space.md,
  },
  spacer: {
    marginTop: space.sm,
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
