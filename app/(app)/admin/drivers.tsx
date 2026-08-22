import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchAdminDrivers } from '@/api/admin';
import { copy } from '@/copy/uk';
import { verificationStatusLabel } from '@/drivers/verification';
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
  userFacingError,
  verificationTone,
} from '@/ui';

export default function AdminDriversScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      userId: string;
      phone: string | null;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      hasAvatar: boolean;
      verificationStatus: string;
      isOnline: boolean;
      completedOrdersCount: number;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminDrivers(token));
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
      <AppText variant="hero">{copy.adminDrivers}</AppText>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {items.length === 0 ? <EmptyState title={copy.empty} /> : null}
      <View style={styles.list}>
        {items.map((driver) => {
          const name =
            [driver.firstName, driver.lastName].filter(Boolean).join(' ') ||
            driver.displayName ||
            driver.phone ||
            driver.userId.slice(0, 8);
          return (
            <Card key={driver.userId} style={styles.card}>
              <AppText variant="card">{name}</AppText>
              <AppText variant="caption" color={colors.muted}>
                {driver.phone}
              </AppText>
              <StatusBadge
                label={verificationStatusLabel(driver.verificationStatus)}
                tone={verificationTone(driver.verificationStatus)}
              />
              <AppText variant="caption" color={colors.muted}>
                {driver.isOnline ? copy.onlineTitle : copy.offlineTitle} · {driver.completedOrdersCount}
              </AppText>
              <Button
                label={copy.adminDriverDetails}
                onPress={() =>
                  router.push({
                    pathname: '/admin/driver/[id]',
                    params: { id: driver.userId },
                  })
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
