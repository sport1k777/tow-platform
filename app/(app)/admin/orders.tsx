import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAdminOrders, setAdminOrderStatus } from '@/api/admin';
import { copy } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AdminOrdersScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      id: string;
      status: string;
      serviceKey: string;
      amountKopiyky: number;
      pickupLabel: string;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminOrders(token));
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
        <Text style={styles.title}>{copy.adminOrders}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length === 0 ? <Text style={styles.meta}>{copy.empty}</Text> : null}
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((order) => (
            <View key={order.id} style={styles.card}>
              <Text style={styles.cardTitle}>{order.status}</Text>
              <Text style={styles.meta}>{order.serviceKey}</Text>
              <Text style={styles.meta}>{formatUah(order.amountKopiyky)}</Text>
              <Text style={styles.meta}>{order.pickupLabel}</Text>
              <Pressable
                style={styles.secondary}
                onPress={() =>
                  void authed((token) =>
                    setAdminOrderStatus(
                      order.id,
                      { status: 'cancelled', reason: 'admin' },
                      token,
                    ),
                  ).then(() => load())
                }
              >
                <Text style={styles.secondaryLabel}>{copy.cancelOrder}</Text>
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
  secondary: { marginTop: 12, alignItems: 'flex-start' },
  secondaryLabel: { color: colors.accent, fontWeight: '600' },
});
