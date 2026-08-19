import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAdminPricing, saveAdminPricing } from '@/api/admin';
import { copy } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AdminPricingScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      id: string;
      serviceKey: string;
      vehicleCategory: string | null;
      baseFeeKopiyky: number;
      perKmKopiyky: number;
      minFeeKopiyky: number;
      active: boolean;
    }[]
  >([]);
  const [base, setBase] = useState('50000');
  const [perKm, setPerKm] = useState('2500');
  const [min, setMin] = useState('50000');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminPricing(token));
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

  async function onSave() {
    try {
      await authed((token) =>
        saveAdminPricing(
          {
            serviceKey: 'tow',
            baseFeeKopiyky: Number(base),
            perKmKopiyky: Number(perKm),
            minFeeKopiyky: Number(min),
            active: true,
          },
          token,
        ),
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.requestError);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{copy.adminPricing}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          keyboardType="number-pad"
          style={styles.input}
          value={base}
          onChangeText={setBase}
        />
        <TextInput
          keyboardType="number-pad"
          style={styles.input}
          value={perKm}
          onChangeText={setPerKm}
        />
        <TextInput
          keyboardType="number-pad"
          style={styles.input}
          value={min}
          onChangeText={setMin}
        />
        <Pressable style={styles.primary} onPress={() => void onSave()}>
          <Text style={styles.primaryLabel}>{copy.profileSave}</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((rule) => (
            <View key={rule.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {rule.serviceKey} {rule.vehicleCategory ?? ''}
              </Text>
              <Text style={styles.meta}>{formatUah(rule.baseFeeKopiyky)}</Text>
              <Text style={styles.meta}>{rule.active ? 'active' : 'off'}</Text>
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
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  list: { gap: 12, paddingBottom: 24, paddingTop: 12 },
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
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: { color: colors.surface, fontWeight: '700' },
});
