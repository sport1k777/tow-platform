import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchOrders, type OrderResponse } from '@/api/orders';
import { copy } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function CustomerHistoryScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<OrderResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await authed((token) => fetchOrders(token));
        if (!cancelled) {
          setItems(response.items);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : copy.requestError);
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.myOrders}</Text>
        <Text style={styles.subtitle}>
          {busy ? copy.loading : items.length === 0 ? copy.ordersEmpty : copy.customerHomeSubtitle}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView contentContainerStyle={styles.list}>
          {items.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() =>
                router.push({
                  pathname: './order/[id]',
                  params: { id: order.id },
                })
              }
            >
              <Text style={styles.cardTitle}>{orderStatusLabel(order.status)}</Text>
              <Text style={styles.price}>{formatUah(order.amountKopiyky)}</Text>
              <Text style={styles.cardHint}>{order.pickup.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardHint: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  price: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
  },
  error: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.85,
  },
});
