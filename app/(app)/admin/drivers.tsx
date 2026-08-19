import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAdminDrivers, setAdminDriverStatus } from '@/api/admin';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AdminDriversScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      userId: string;
      phone: string | null;
      displayName: string | null;
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
        <Text style={styles.title}>{copy.adminDrivers}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length === 0 ? <Text style={styles.meta}>{copy.empty}</Text> : null}
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((driver) => (
            <View key={driver.userId} style={styles.card}>
              <Text style={styles.cardTitle}>
                {driver.displayName ?? driver.phone ?? driver.userId.slice(0, 8)}
              </Text>
              <Text style={styles.meta}>{driver.phone}</Text>
              <Text style={styles.meta}>
                {copy.verificationLabel}: {driver.verificationStatus}
              </Text>
              <Pressable
                style={styles.primary}
                onPress={() =>
                  void authed((token) =>
                    setAdminDriverStatus(driver.userId, 'approved', token),
                  ).then(() => load())
                }
              >
                <Text style={styles.primaryLabel}>{copy.approveDriver}</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() =>
                  void authed((token) =>
                    setAdminDriverStatus(driver.userId, 'suspended', token),
                  ).then(() => load())
                }
              >
                <Text style={styles.secondaryLabel}>{copy.suspendDriver}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 16 },
  list: { gap: 12, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 4 },
  error: { color: colors.accent, marginBottom: 12 },
  primary: {
    marginTop: 12,
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryLabel: { color: colors.surface, fontWeight: '700' },
  secondary: { marginTop: 8, alignItems: 'center', paddingVertical: 8 },
  secondaryLabel: { color: colors.accent, fontWeight: '600' },
});
