import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAdminStats } from '@/api/admin';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

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
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.adminTitle}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{copy.adminDashboard}</Text>
          <Text style={styles.meta}>
            {copy.adminUsers}: {stats?.users ?? '—'}
          </Text>
          <Text style={styles.meta}>
            {copy.adminDrivers}: {stats?.drivers ?? '—'}
          </Text>
          <Text style={styles.meta}>
            {copy.adminOrders}: {stats?.orders ?? '—'}
          </Text>
        </View>

        <Pressable style={styles.modeButton} onPress={() => router.push('./orders')}>
          <Text style={styles.modeLabel}>{copy.adminOrders}</Text>
        </Pressable>
        <Pressable style={styles.modeButton} onPress={() => router.push('./drivers')}>
          <Text style={styles.modeLabel}>{copy.adminDrivers}</Text>
        </Pressable>
        <Pressable style={styles.modeButton} onPress={() => router.push('./pricing')}>
          <Text style={styles.modeLabel}>{copy.adminPricing}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.replace('/customer')}>
          <Text style={styles.secondaryLabel}>{copy.switchToCustomer}</Text>
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
    marginBottom: 16,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  meta: { color: colors.muted, marginTop: 4 },
  error: { color: colors.accent, marginBottom: 12 },
  modeButton: {
    marginTop: 12,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modeLabel: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  secondary: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  secondaryLabel: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
