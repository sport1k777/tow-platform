import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchDriverMe, type DriverMe } from '@/api/drivers';
import { updateDisplayName } from '@/api/users';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function DriverProfileScreen() {
  const { authed, refreshProfile, signOut } = useSession();
  const [me, setMe] = useState<DriverMe | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const profile = await authed((token) => fetchDriverMe(token));
      setMe(profile);
      setName(profile.displayName ?? '');
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
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await authed((token) => updateDisplayName(name.trim(), token));
      await refreshProfile();
      await load();
      setOk(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.requestError);
    } finally {
      setBusy(false);
    }
  }

  const vehicle = me?.vehicles[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.profileTitle}</Text>
        <Text style={styles.subtitle}>{me?.phone ?? ''}</Text>

        <TextInput
          accessibilityLabel={copy.profileName}
          placeholder={copy.profileName}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{copy.verificationLabel}</Text>
          <Text style={styles.cardTitle}>{me?.verificationStatus ?? ''}</Text>
          <Text style={[styles.cardLabel, styles.spacer]}>{copy.vehicleTitle}</Text>
          <Text style={styles.cardTitle}>
            {vehicle?.plateNumber ?? copy.vehiclePlaceholder}
          </Text>
          <Text style={styles.meta}>
            {copy.ratingLabel}: {me?.rating ?? '—'} · {me?.completedOrdersCount ?? 0}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {ok ? <Text style={styles.ok}>{copy.saved}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || name.trim().length < 2}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => void onSave()}
        >
          <Text style={styles.primaryLabel}>{busy ? copy.loading : copy.profileSave}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
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
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 16, marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  spacer: { marginTop: 12 },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.accent, marginBottom: 12 },
  ok: { color: colors.online, marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: { color: colors.surface, fontSize: 17, fontWeight: '700' },
  signOut: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  signOutLabel: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
