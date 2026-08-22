import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  acceptOffer,
  fetchCurrentOffer,
  fetchDriverMe,
  fetchDriverOrders,
  rejectOffer,
  setDriverPresence,
  type DriverMe,
  type DriverOffer,
} from '@/api/drivers';
import type { OrderResponse } from '@/api/orders';
import { ownAvatarUri } from '@/api/users';
import { copy, serviceTitle } from '@/copy/uk';
import { isApprovedDriver, verificationStatusLabel } from '@/drivers/verification';
import { formatRouteSummary, formatUah } from '@/format/money';
import { mapProvider } from '@/maps/provider';
import { orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  ConfirmModal,
  PressScale,
  Screen,
  SectionHeader,
  StatusBadge,
  orderStatusTone,
  userFacingError,
  verificationTone,
} from '@/ui';

export default function DriverHomeScreen() {
  const { authed, getAccessToken } = useSession();
  const [me, setMe] = useState<DriverMe | null>(null);
  const [offer, setOffer] = useState<DriverOffer | null>(null);
  const [active, setActive] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const token = getAccessToken();

  const load = useCallback(async () => {
    try {
      const profile = await authed((token) => fetchDriverMe(token));
      setMe(profile);
      if (!isApprovedDriver(profile.verificationStatus)) {
        setOffer(null);
        setActive(null);
        setError(null);
        return;
      }
      const [current, orders] = await Promise.all([
        authed((token) => fetchCurrentOffer(token)),
        authed((token) => fetchDriverOrders(token)),
      ]);
      setOffer(current.offer);
      setActive(
        orders.items.find((item) =>
          ['accepted', 'driver_en_route', 'arrived', 'in_progress'].includes(item.status),
        ) ?? null,
      );
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

  async function onToggle(online: boolean) {
    if (online && !me?.canGoOnline) {
      setBlockedOpen(true);
      return;
    }
    setBusy(true);
    try {
      const location = await mapProvider.getCurrentPosition();
      const next = await authed((access) =>
        setDriverPresence(
          {
            online,
            ...(location.ok ? { lat: location.lat, lng: location.lng } : {}),
          },
          access,
        ),
      );
      setMe(next);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const canGoOnline = Boolean(me?.canGoOnline);
  const online = Boolean(me?.isOnline);

  return (
    <Screen scroll embedInTabs>
      <View style={styles.top}>
        <View>
          <AppText variant="caption" color={colors.secondary} style={styles.brand}>
            {copy.brandShort}
          </AppText>
          <AppText variant="hero">{copy.driverModeTitle}</AppText>
        </View>
        <Avatar
          uri={ownAvatarUri(Boolean(me?.hasAvatar), me?.userId)}
          headers={token ? { Authorization: `Bearer ${token}` } : undefined}
          name={me?.displayName ?? [me?.firstName, me?.lastName].filter(Boolean).join(' ')}
          size={48}
        />
      </View>

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <PressScale
        accessibilityRole="switch"
        accessibilityState={{ checked: online, disabled: busy }}
        disabled={busy}
        onPress={() => void onToggle(!online)}
        style={[styles.presence, online && styles.presenceOn]}
      >
        <View style={[styles.dot, online && styles.dotOn]} />
        <AppText variant="title" style={styles.presenceTitle}>
          {online ? copy.onlineTitle : copy.offlineTitle}
        </AppText>
        <AppText variant="caption" color={online ? colors.success : colors.secondary}>
          {canGoOnline
            ? online
              ? copy.receivingOrders
              : copy.goOnlineHint
            : copy.driverPendingHint}
        </AppText>
      </PressScale>

      <StatusBadge
        label={verificationStatusLabel(me?.verificationStatus)}
        tone={verificationTone(me?.verificationStatus)}
      />

      <SectionHeader title={copy.today} />
      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <AppText variant="hero">{me?.completedOrdersCount ?? 0}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {copy.metricOrders}
          </AppText>
        </Card>
        <Card style={styles.metric}>
          <AppText variant="hero">{copy.metricUnavailable}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {copy.earningsTitle}
          </AppText>
        </Card>
        <Card style={styles.metric}>
          <AppText variant="hero">{copy.metricUnavailable}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {copy.metricKm}
          </AppText>
        </Card>
      </View>

      {offer ? (
        <Card elevated style={styles.block}>
          <AppText variant="caption" color={colors.secondary}>
            {copy.driverOfferTitle}
          </AppText>
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
          <AppText variant="title" color={colors.accent}>
            {formatUah(offer.order.amountKopiyky)}
          </AppText>
          <View style={styles.actions}>
            <Button
              label={copy.acceptOffer}
              onPress={() =>
                void authed((token) => acceptOffer(offer.id, token)).then((order) => {
                  setActive(order);
                  setOffer(null);
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
                void authed((token) => rejectOffer(offer.id, token)).then(() => setOffer(null))
              }
            />
          </View>
        </Card>
      ) : null}

      {active ? (
        <PressScale
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/driver/order/[id]',
              params: { id: active.id },
            })
          }
          style={styles.active}
        >
          <StatusBadge
            label={orderStatusLabel(active.status)}
            tone={orderStatusTone(active.status)}
          />
          <AppText variant="card">{active.pickup.label}</AppText>
          <AppText variant="title" color={colors.accent}>
            {formatUah(active.amountKopiyky)}
          </AppText>
        </PressScale>
      ) : null}

      <ConfirmModal
        visible={blockedOpen}
        title={copy.onlineBlockedTitle}
        body={copy.onlineBlockedBody}
        primaryLabel={copy.goToVerification}
        secondaryLabel={copy.close}
        onPrimary={() => {
          setBlockedOpen(false);
          router.push('/driver/verification');
        }}
        onSecondary={() => setBlockedOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  brand: {
    letterSpacing: 3,
    marginBottom: space.sm,
  },
  error: {
    marginTop: space.md,
  },
  presence: {
    marginTop: space.md,
    marginBottom: space.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.xxl,
    gap: space.sm,
  },
  presenceOn: {
    borderColor: 'rgba(53, 199, 89, 0.45)',
    backgroundColor: 'rgba(53, 199, 89, 0.08)',
  },
  presenceTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.offline,
  },
  dotOn: {
    backgroundColor: colors.online,
  },
  metrics: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  block: {
    marginBottom: space.md,
    gap: 6,
  },
  actions: {
    marginTop: space.md,
    gap: space.sm,
  },
  active: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginBottom: space.md,
  },
});
