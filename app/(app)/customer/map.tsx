import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, type MapPressEvent } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchRoute, geocode, reverseGeocode, type GeoPlace, type GeoRoute } from '@/api/geo';
import { defaultMapRegion } from '@/config/map';
import { isServiceKey, serviceDestinationPolicy } from '@/config/services';
import { copy } from '@/copy/uk';
import { getForegroundLocation } from '@/maps/location';
import { useSession } from '@/session';
import { colors } from '@/theme';

type ActivePin = 'pickup' | 'destination';

export default function CustomerMapScreen() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const { getAccessToken } = useSession();
  const serviceKey = isServiceKey(service) ? service : 'tow';
  const destinationRequired = serviceDestinationPolicy[serviceKey] === 'required';

  const [query, setQuery] = useState('');
  const [activePin, setActivePin] = useState<ActivePin>('pickup');
  const [pickup, setPickup] = useState<GeoPlace | null>(null);
  const [destination, setDestination] = useState<GeoPlace | null>(null);
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [route, setRoute] = useState<GeoRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const region = useMemo(() => {
    const point = pickup ?? destination;
    if (!point) {
      return defaultMapRegion;
    }
    return {
      latitude: point.lat,
      longitude: point.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [pickup, destination]);

  const loadCurrentLocation = useCallback(async () => {
    setBusy(true);
    setError(null);
    const location = await getForegroundLocation();
    if (!location.ok) {
      setError(location.reason === 'denied' ? copy.locationDenied : copy.locationUnavailable);
      setBusy(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError(copy.authError);
      setBusy(false);
      return;
    }

    try {
      const place = await reverseGeocode(location.lat, location.lng, token);
      setPickup(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.mapOutsideUkraine);
    } finally {
      setBusy(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !pickup || !destination) {
      return;
    }

    let cancelled = false;
    void fetchRoute(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: destination.lat, lng: destination.lng },
      token,
    )
      .then((next) => {
        if (!cancelled) {
          setRoute(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setRoute(null);
          setError(caught instanceof Error ? caught.message : copy.mapRouteError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, destination, getAccessToken]);

  async function onSearch() {
    const token = getAccessToken();
    if (!token) {
      setError(copy.authError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await geocode(query, token);
      setResults(response.items);
      if (response.items.length === 0) {
        setError(copy.mapNoResults);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.mapNoResults);
    } finally {
      setBusy(false);
    }
  }

  function applyPlace(place: GeoPlace) {
    setResults([]);
    setQuery(place.label);
    if (activePin === 'destination') {
      setDestination(place);
      return;
    }
    setPickup(place);
  }

  async function onMapPress(event: MapPressEvent) {
    const token = getAccessToken();
    if (!token) {
      setError(copy.authError);
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    setBusy(true);
    setError(null);
    try {
      const place = await reverseGeocode(latitude, longitude, token);
      applyPlace(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.mapOutsideUkraine);
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = destinationRequired ? Boolean(pickup && destination) : Boolean(pickup);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.mapTitle}</Text>
        <Text style={styles.subtitle}>{copy.mapSubtitle}</Text>

        <View style={styles.pinRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.pinButton, activePin === 'pickup' && styles.pinButtonActive]}
            onPress={() => setActivePin('pickup')}
          >
            <Text style={styles.pinLabel}>{copy.mapPickup}</Text>
          </Pressable>
          {destinationRequired || destination ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.pinButton, activePin === 'destination' && styles.pinButtonActive]}
              onPress={() => setActivePin('destination')}
            >
              <Text style={styles.pinLabel}>{copy.mapDestination}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={styles.pinButton}
              onPress={() => setActivePin('destination')}
            >
              <Text style={styles.pinLabel}>{copy.mapAddDestination}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel={copy.mapSearchPlaceholder}
            placeholder={copy.mapSearchPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
            onPress={() => {
              void onSearch();
            }}
          >
            <Text style={styles.searchLabel}>{copy.mapSearch}</Text>
          </Pressable>
        </View>

        {results.map((place) => (
          <Pressable
            key={`${place.lat}:${place.lng}:${place.label}`}
            accessibilityRole="button"
            style={styles.result}
            onPress={() => applyPlace(place)}
          >
            <Text style={styles.resultLabel}>{place.label}</Text>
          </Pressable>
        ))}

        <MapView style={styles.map} region={region} onPress={(event) => void onMapPress(event)}>
          {pickup ? (
            <Marker
              coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
              title={copy.mapPickup}
              pinColor={colors.accent}
            />
          ) : null}
          {destination ? (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={copy.mapDestination}
              pinColor={colors.navy}
            />
          ) : null}
          {pickup && destination && route ? (
            <Polyline
              coordinates={route.polyline.map((point) => ({
                latitude: point.lat,
                longitude: point.lng,
              }))}
              strokeColor={colors.navy}
              strokeWidth={4}
            />
          ) : null}
        </MapView>

        {pickup && destination && route ? (
          <Text style={styles.routeSummary}>
            {formatRoute(route.distanceMeters, route.durationSeconds)}
          </Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => {
            void loadCurrentLocation();
          }}
        >
          <Text style={styles.secondaryLabel}>{copy.useMyLocation}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canConfirm}
          style={({ pressed }) => [
            styles.primaryButton,
            !canConfirm && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryLabel}>{copy.mapDone}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatRoute(distanceMeters: number, durationSeconds: number): string {
  const km = (distanceMeters / 1000).toFixed(1);
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${km} км · ${minutes} хв`;
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
  pinRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pinButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pinButtonActive: {
    borderColor: colors.accent,
  },
  pinLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchButton: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchLabel: {
    color: colors.surface,
    fontWeight: '700',
  },
  result: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultLabel: {
    color: colors.text,
    fontSize: 15,
  },
  map: {
    flex: 1,
    minHeight: 220,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  routeSummary: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  error: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryLabel: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
