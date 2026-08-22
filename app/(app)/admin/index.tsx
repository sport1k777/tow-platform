import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchAdminStats } from '@/api/admin';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import { AppText, Button, Card, Screen, userFacingError } from '@/ui';

export default function AdminHomeScreen() {
  const { authed } = useSession();
  const [stats, setStats] = useState<{
    users: number;
    drivers: number;
    orders: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminStats(token));
      setStats(next);
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
      <AppText variant="caption" color={colors.muted} style={styles.brand}>
        {copy.brandShort}
      </AppText>
      <AppText variant="hero">{copy.adminTitle}</AppText>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <AppText variant="caption" color={colors.muted}>
            {copy.adminUsers}
          </AppText>
          <AppText variant="title">{stats?.users ?? '—'}</AppText>
        </Card>
        <Card style={styles.metric}>
          <AppText variant="caption" color={colors.muted}>
            {copy.adminDrivers}
          </AppText>
          <AppText variant="title">{stats?.drivers ?? '—'}</AppText>
        </Card>
        <Card style={styles.metric}>
          <AppText variant="caption" color={colors.muted}>
            {copy.adminOrders}
          </AppText>
          <AppText variant="title">{stats?.orders ?? '—'}</AppText>
        </Card>
      </View>

      <View style={styles.nav}>
        <Button label={copy.adminOrders} variant="secondary" onPress={() => router.push('/admin/orders')} />
        <Button label={copy.adminDrivers} variant="secondary" onPress={() => router.push('/admin/drivers')} />
        <Button label={copy.adminPricing} variant="secondary" onPress={() => router.push('/admin/pricing')} />
        <Button
          label={copy.switchToCustomer}
          variant="tertiary"
          onPress={() => router.replace('/customer')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    letterSpacing: 3,
    marginBottom: space.sm,
  },
  error: {
    marginTop: space.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xxl,
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  nav: {
    marginTop: space.xxl,
    gap: space.sm,
  },
});
