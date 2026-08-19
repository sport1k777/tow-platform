import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createOrder } from '@/api/orders';
import { createQuote, type QuoteResponse } from '@/api/quotes';
import {
  isServiceKey,
  vehicleCategories,
  type VehicleCategory,
} from '@/config/services';
import { copy } from '@/copy/uk';
import { formatRouteSummary, formatUah } from '@/format/money';
import { parsePlaceParam } from '@/navigation/params';
import { useSession } from '@/session';
import { colors } from '@/theme';

const vehicleLabels: Record<VehicleCategory, string> = {
  car: copy.vehicleCar,
  suv: copy.vehicleSuv,
  van: copy.vehicleVan,
  motorcycle: copy.vehicleMotorcycle,
};

export default function CustomerDetailsScreen() {
  const params = useLocalSearchParams<{
    service?: string;
    pickup?: string;
    destination?: string;
  }>();
  const { authed } = useSession();
  const serviceKey = isServiceKey(params.service) ? params.service : 'tow';
  const pickup = useMemo(() => parsePlaceParam(params.pickup), [params.pickup]);
  const destination = useMemo(
    () => parsePlaceParam(params.destination),
    [params.destination],
  );
  const categoryRequired = serviceKey === 'tow';

  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | null>(
    categoryRequired ? 'car' : null,
  );
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRequestQuote() {
    if (!pickup) {
      setError(copy.requestError);
      return;
    }
    if (categoryRequired && !vehicleCategory) {
      setError(copy.requestError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await authed((token) =>
        createQuote(
          {
            serviceKey,
            pickup,
            destination: destination ?? undefined,
            vehicleCategory: vehicleCategory ?? undefined,
            details: notes.trim() ? { notes: notes.trim() } : undefined,
          },
          token,
        ),
      );
      setQuote(next);
    } catch (caught) {
      setQuote(null);
      setError(caught instanceof Error ? caught.message : copy.requestError);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmOrder() {
    if (!quote) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await authed((token) => createOrder(quote.id, token));
      router.replace({
        pathname: './order/[id]',
        params: { id: order.id },
      });
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
        <Text style={styles.title}>{copy.detailsTitle}</Text>
        <Text style={styles.subtitle}>{copy.detailsSubtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{copy.pickupLabel}</Text>
          <Text style={styles.cardTitle}>{pickup?.label ?? '—'}</Text>
          {destination ? (
            <>
              <Text style={[styles.cardLabel, styles.cardSpacer]}>{copy.destinationLabel}</Text>
              <Text style={styles.cardTitle}>{destination.label}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.grid}>
          {vehicleCategories.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={vehicleLabels[category]}
              style={[
                styles.tile,
                vehicleCategory === category && styles.tileActive,
              ]}
              onPress={() => {
                setVehicleCategory(category);
                setQuote(null);
              }}
            >
              <Text
                style={[
                  styles.tileTitle,
                  vehicleCategory === category && styles.tileTitleActive,
                ]}
              >
                {vehicleLabels[category]}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          accessibilityLabel={copy.notesPlaceholder}
          multiline
          placeholder={copy.notesPlaceholder}
          placeholderTextColor={colors.muted}
          style={styles.notes}
          value={notes}
          onChangeText={(value) => {
            setNotes(value);
            setQuote(null);
          }}
        />

        {quote ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{copy.quoteTitle}</Text>
            <Text style={styles.price}>{formatUah(quote.amountKopiyky)}</Text>
            <Text style={styles.cardTitle}>
              {formatRouteSummary(quote.distanceMeters, quote.durationSeconds)}
            </Text>
            <Text style={styles.cardHint}>
              {copy.quoteExpires}{' '}
              {new Date(quote.expiresAt).toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || !pickup}
          style={({ pressed }) => [
            styles.primaryButton,
            (busy || !pickup) && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void (quote ? onConfirmOrder() : onRequestQuote());
          }}
        >
          <Text style={styles.primaryLabel}>
            {busy ? copy.loading : quote ? copy.confirmOrder : copy.requestQuote}
          </Text>
        </Pressable>
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
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSpacer: {
    marginTop: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  notes: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  tileActive: {
    borderColor: colors.accent,
    backgroundColor: '#FFF6F0',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  tileTitleActive: {
    color: colors.accent,
  },
  price: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardHint: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  error: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
