import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { copy } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { getForegroundLocation } from '@/maps/location';
import { orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function DriverHomeScreen() {
  const { authed, switchToCustomerMode, signOut } = useSession();
  const [me, setMe] = useState<DriverMe | null>(null);
  const [offer, setOffer] = useState<DriverOffer | null>(null);
  const [active, setActive] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profile, current, orders] = await Promise.all([
        authed((token) => fetchDriverMe(token)),
        authed((token) => fetchCurrentOffer(token)),
        authed((token) => fetchDriverOrders(token)),
      ]);
      setMe(profile);
      setOffer(current.offer);
      setActive(
        orders.items.find((item) =>
          ['accepted', 'driver_en_route', 'arrived', 'in_progress'].includes(item.status),
        ) ?? null,
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.requestError);
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
    setBusy(true);
    try {
      const location = await getForegroundLocation();
      const next = await authed((token) =>
        setDriverPresence(
          {
            online,
            ...(location.ok ? { lat: location.lat, lng: location.lng } : {}),
          },
          token,
        ),
      );
      setMe(next);
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
        <Text style={styles.title}>{copy.driverHomeTitle}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>
              {me?.isOnline ? copy.driverOnline : copy.driverOffline}
            </Text>
            <Switch
              disabled={busy || me?.availability === 'suspended'}
              value={Boolean(me?.isOnline)}
              onValueChange={(value) => void onToggle(value)}
              trackColor={{ false: colors.border, true: colors.online }}
              thumbColor={colors.surface}
            />
          </View>
          <Text style={styles.meta}>{me?.availability ?? ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{copy.vehicleTitle}</Text>
          <Text style={styles.cardTitle}>
            {me?.vehicles[0]?.plateNumber ?? copy.vehiclePlaceholder}
          </Text>
          <Text style={styles.meta}>
            {copy.earningsTitle}: {me?.completedOrdersCount ?? 0}
          </Text>
        </View>

        {offer ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{copy.driverOfferTitle}</Text>
            <Text style={styles.cardTitle}>{offer.order.pickup.label}</Text>
            <Text style={styles.meta}>{formatUah(offer.order.amountKopiyky)}</Text>
            <Pressable
              style={styles.primary}
              onPress={() =>
                void authed((token) => acceptOffer(offer.id, token)).then((order) => {
                  setActive(order);
                  setOffer(null);
                })
              }
            >
              <Text style={styles.primaryLabel}>{copy.acceptOffer}</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() =>
                void authed((token) => rejectOffer(offer.id, token)).then(() => setOffer(null))
              }
            >
              <Text style={styles.secondaryLabel}>{copy.rejectOffer}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.meta}>{me?.isOnline ? copy.noOffers : copy.goOnlineHint}</Text>
        )}

        {active ? (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: './order/[id]',
                params: { id: active.id },
              })
            }
          >
            <Text style={styles.cardLabel}>{copy.orderTitle}</Text>
            <Text style={styles.cardTitle}>{orderStatusLabel(active.status)}</Text>
            <Text style={styles.meta}>{active.pickup.label}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.modeButton} onPress={() => router.push('./profile')}>
          <Text style={styles.modeLabel}>{copy.profileTitle}</Text>
        </Pressable>
        <Pressable
          style={styles.modeButton}
          onPress={() => {
            switchToCustomerMode();
            router.replace('/customer');
          }}
        >
          <Text style={styles.modeLabel}>{copy.switchToCustomer}</Text>
        </Pressable>
        <Pressable
          style={styles.signOut}
          onPress={() => void signOut().then(() => router.replace('/(auth)'))}
        >
          <Text style={styles.signOutLabel}>{copy.signOut}</Text>
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
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.accent, marginBottom: 12 },
  primary: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: { color: colors.surface, fontWeight: '700' },
  secondary: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { color: colors.navy, fontWeight: '600' },
  modeButton: {
    marginTop: 12,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modeLabel: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  signOut: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  signOutLabel: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
