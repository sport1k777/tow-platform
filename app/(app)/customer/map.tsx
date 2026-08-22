import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, type MapPressEvent } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { destinationRequiredFor } from '@/booking/flow';
import { bookingTypeForService } from '@/booking/serviceType';
import { fetchServiceTypes } from '@/api/catalog';
import { type GeoPlace } from '@/api/geo';
import { defaultMapRegion } from '@/config/map';
import { isServiceKey } from '@/config/services';
import { copy, locationErrorLabel, serviceTitle } from '@/copy/uk';
import { formatRouteSummary } from '@/format/money';
import type { PickupSource } from '@/geo/pickup-source';
import { isInUkraine } from '@/geo/ukraine-bounds';
import { useAddressAutocomplete } from '@/geo/useAddressAutocomplete';
import { darkMapStyle } from '@/maps/darkStyle';
import { mapProvider, type MapRoute } from '@/maps/provider';
import { regionForPlaces } from '@/maps/region';
import { placeFromCoords } from '@/maps/resolve-place';
import { useSession } from '@/session';
import { colors, radius, shadows, space } from '@/theme';
import { AppText, Button, Icon, NavBack, PressScale, TextField, userFacingError } from '@/ui';

type ActivePin = 'pickup' | 'destination';

export default function CustomerMapScreen() {
  const { service, cargoKind } = useLocalSearchParams<{ service?: string; cargoKind?: string }>();
  const { authed } = useSession();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const pickupInput = useRef<TextInput>(null);
  const destinationInput = useRef<TextInput>(null);
  const locatingRef = useRef(false);
  const serviceKey = isServiceKey(service) ? service : 'tow';
  const bookingType = bookingTypeForService(serviceKey);
  const [destinationRequired, setDestinationRequired] = useState(
    destinationRequiredFor(bookingType),
  );

  const [pickupQuery, setPickupQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [activePin, setActivePin] = useState<ActivePin>('pickup');
  const [focused, setFocused] = useState<ActivePin | null>(null);
  const [pickup, setPickup] = useState<GeoPlace | null>(null);
  const [destination, setDestination] = useState<GeoPlace | null>(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [mapPickMode, setMapPickMode] = useState<ActivePin | null>(null);
  const [route, setRoute] = useState<MapRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const activeQuery = activePin === 'pickup' ? pickupQuery : destinationQuery;
  const selectedLabel = activePin === 'pickup' ? pickup?.label : destination?.label;
  const pickupNeedsConfirm =
    Boolean(pickup) &&
    !pickupConfirmed &&
    (pickup?.source === 'current_location' || pickup?.source === 'map_pin');

  const searchPlaces = useCallback(
    (query: string) =>
      mapProvider.mock
        ? mapProvider.autocompletePlaces(query)
        : authed((token) => mapProvider.autocompletePlaces(query, token)),
    [authed],
  );

  const suggestions = useAddressAutocomplete({
    query: activeQuery,
    selectedLabel,
    enabled: focused === activePin && mapPickMode == null,
    search: searchPlaces,
  });

  const goToDetails = useCallback(
    (nextPickup: GeoPlace, nextDestination: GeoPlace | null) => {
      router.push({
        pathname: '/customer/details',
        params: {
          service: serviceKey,
          pickup: JSON.stringify(nextPickup),
          destination: nextDestination ? JSON.stringify(nextDestination) : '',
          ...(typeof cargoKind === 'string' && cargoKind ? { cargoKind } : {}),
        },
      });
    },
    [cargoKind, serviceKey],
  );

  const focusMap = useCallback((points: { lat: number; lng: number }[]) => {
    if (points.length === 0) {
      return;
    }
    mapRef.current?.animateToRegion(regionForPlaces(points), 400);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hidden = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  async function reversePoint(lat: number, lng: number, source: PickupSource): Promise<GeoPlace> {
    if (!isInUkraine({ lat, lng })) {
      throw new Error(copy.mapOutsideUkraine);
    }
    try {
      const resolved = mapProvider.mock
        ? await mapProvider.reverseGeocode(lat, lng)
        : await authed((token) => mapProvider.reverseGeocode(lat, lng, token));
      return placeFromCoords(lat, lng, source, resolved);
    } catch {
      return placeFromCoords(lat, lng, source, null);
    }
  }

  function applyPlace(place: GeoPlace, pin: ActivePin = activePin) {
    const source = place.source ?? 'manual_address';
    const next = { ...place, source };
    setError(null);
    setMapPickMode(null);
    if (pin === 'destination') {
      setDestination(next);
      setDestinationQuery(next.label);
      setFocused(null);
      Keyboard.dismiss();
      focusMap(pickup ? [pickup, next] : [next]);
      if (pickup && pickupConfirmed) {
        goToDetails(pickup, next);
      }
      return;
    }
    setPickup(next);
    setPickupQuery(next.label);
    focusMap(destination ? [next, destination] : [next]);
    if (source !== 'manual_address') {
      setPickupConfirmed(false);
      setFocused(null);
      Keyboard.dismiss();
      return;
    }
    confirmPickup(next);
  }

  function confirmPickup(next = pickup) {
    if (!next) {
      return;
    }
    setPickupConfirmed(true);
    setFocused(null);
    Keyboard.dismiss();
    if (destinationRequired) {
      setActivePin('destination');
      setTimeout(() => destinationInput.current?.focus(), 40);
      return;
    }
    goToDetails(next, destination);
  }

  function changePickup() {
    setPickup(null);
    setPickupConfirmed(false);
    setPickupQuery('');
    setRoute(null);
    setMapPickMode(null);
    setActivePin('pickup');
    setError(null);
  }

  async function loadCurrentLocation() {
    if (locatingRef.current) {
      return;
    }
    locatingRef.current = true;
    setLocating(true);
    setBusy(true);
    setError(null);
    setMapPickMode(null);
    setActivePin('pickup');
    Keyboard.dismiss();
    try {
      const location = await mapProvider.getCurrentPosition();
      if (!location.ok) {
        setError(locationErrorLabel(location.reason));
        return;
      }
      const place = await reversePoint(location.lat, location.lng, 'current_location');
      applyPlace(place, 'pickup');
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      locatingRef.current = false;
      setLocating(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void authed((token) => fetchServiceTypes(token))
      .then((response) => {
        const item = response.items.find((entry) => entry.key === serviceKey);
        if (!cancelled && item) {
          setDestinationRequired(item.destinationPolicy === 'required');
        }
      })
      .catch(() => {
        // Keep the local destination policy fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [authed, serviceKey]);

  useEffect(() => {
    if (!pickup || !destination || !pickupConfirmed) {
      return;
    }

    let cancelled = false;
    void (mapProvider.mock
      ? mapProvider.previewRoute(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: destination.lat, lng: destination.lng },
        )
      : authed((token) =>
          mapProvider.previewRoute(
            { lat: pickup.lat, lng: pickup.lng },
            { lat: destination.lat, lng: destination.lng },
            token,
          ),
        ))
      .then((next) => {
        if (!cancelled) {
          setRoute(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setRoute(null);
          setError(userFacingError(caught) || copy.mapRouteError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, destination, pickupConfirmed, authed]);

  function onFieldBlur() {
    setTimeout(() => {
      const pickupFocused = pickupInput.current?.isFocused() ?? false;
      const destinationFocused = destinationInput.current?.isFocused() ?? false;
      if (!pickupFocused && !destinationFocused) {
        setFocused(null);
      }
    }, 180);
  }

  function onPickupChange(text: string) {
    setPickupQuery(text);
    setActivePin('pickup');
    setMapPickMode(null);
    if (pickup && text.trim() !== pickup.label) {
      setPickup(null);
      setPickupConfirmed(false);
      setRoute(null);
    }
  }

  function onDestinationChange(text: string) {
    setDestinationQuery(text);
    setActivePin('destination');
    setMapPickMode(null);
    if (destination && text.trim() !== destination.label) {
      setDestination(null);
      setRoute(null);
    }
  }

  async function onMapPress(event: MapPressEvent) {
    if (busy || locating) {
      return;
    }
    const pin = mapPickMode ?? activePin;
    if (pin === 'destination' && (!pickup || !pickupConfirmed)) {
      return;
    }
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setBusy(true);
    setError(null);
    setActivePin(pin);
    try {
      const place = await reversePoint(latitude, longitude, 'map_pin');
      applyPlace(place, pin);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const canContinue = destinationRequired
    ? Boolean(pickup && pickupConfirmed && destination)
    : Boolean(pickup && pickupConfirmed);
  const { height: windowHeight } = useWindowDimensions();
  const typing = (focused != null || keyboardHeight > 0) && !pickupNeedsConfirm;
  const topSheetMax = typing
    ? Math.max(260, windowHeight - keyboardHeight - insets.top - space.xl)
    : Math.max(280, Math.round(windowHeight * (pickupNeedsConfirm ? 0.52 : 0.48)));
  const suggestionMax = Math.max(120, topSheetMax - 280);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...defaultMapRegion }}
        onPress={(event) => void onMapPress(event)}
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
      >
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
            pinColor={colors.text}
          />
        ) : null}
        {pickup && destination && route ? (
          <Polyline
            coordinates={route.polyline.map((point) => ({
              latitude: point.lat,
              longitude: point.lng,
            }))}
            strokeColor={colors.accent}
            strokeWidth={4}
          />
        ) : null}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.topSheet, { maxHeight: topSheetMax }]}>
            <ScrollView
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <NavBack />
              <AppText variant="title">
                {activePin === 'destination' ? copy.mapTitleDestination : copy.mapTitle}
              </AppText>
              <AppText variant="caption" color={colors.muted} style={styles.hint}>
                {serviceTitle(serviceKey)} · {copy.mapSubtitle}
              </AppText>
              {mapProvider.mock ? (
                <AppText variant="caption" color={colors.warning} style={styles.devBanner}>
                  {copy.devGeoBanner}
                </AppText>
              ) : null}

              <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
                {copy.mapPickup}
              </AppText>
              <TextField
                ref={pickupInput}
                accessibilityLabel={copy.mapPickup}
                placeholder={copy.mapSearchPlaceholder}
                value={pickupQuery}
                onChangeText={onPickupChange}
                onFocus={() => {
                  setActivePin('pickup');
                  setFocused('pickup');
                  setMapPickMode(null);
                }}
                onBlur={onFieldBlur}
                autoCorrect={false}
                autoCapitalize="sentences"
                textContentType="none"
                returnKeyType={destinationRequired ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (suggestions.items[0]) {
                    applyPlace({ ...suggestions.items[0], source: 'manual_address' });
                  }
                }}
              />

              <PressScale
                accessibilityRole="button"
                accessibilityState={{ busy: locating }}
                disabled={locating || busy}
                onPress={() => void loadCurrentLocation()}
                style={[styles.actionRow, locating && styles.actionDisabled]}
              >
                {locating ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Icon name="location" color={colors.accent} />
                )}
                <AppText variant="label" color={colors.accent} style={styles.actionLabel}>
                  {locating ? copy.locatingTitle : copy.useMyLocation}
                </AppText>
              </PressScale>

              <PressScale
                accessibilityRole="button"
                accessibilityState={{ selected: mapPickMode === 'pickup' }}
                disabled={locating || busy}
                onPress={() => {
                  Keyboard.dismiss();
                  setActivePin('pickup');
                  setFocused(null);
                  setMapPickMode((current) => (current === 'pickup' ? null : 'pickup'));
                  setError(null);
                }}
                style={[
                  styles.actionRow,
                  mapPickMode === 'pickup' && styles.actionActive,
                ]}
              >
                <Icon name="search" color={mapPickMode === 'pickup' ? colors.accent : colors.text} />
                <AppText
                  variant="label"
                  color={mapPickMode === 'pickup' ? colors.accent : colors.text}
                  style={styles.actionLabel}
                >
                  {copy.pickOnMap}
                </AppText>
              </PressScale>

              {mapPickMode === 'pickup' ? (
                <AppText variant="caption" color={colors.accent} style={styles.searchMessage}>
                  {copy.mapPickHint}
                </AppText>
              ) : null}

              {pickupNeedsConfirm && pickup ? (
                <View style={styles.confirmCard}>
                  <AppText variant="caption" color={colors.muted}>
                    {pickup.source === 'map_pin' ? copy.gpsMapPoint : copy.gpsMyLocation}
                  </AppText>
                  <AppText variant="card">{pickup.label}</AppText>
                  <Button
                    label={copy.confirmLocation}
                    disabled={busy || locating}
                    onPress={() => confirmPickup()}
                  />
                  <Button
                    label={copy.changeLocation}
                    variant="secondary"
                    disabled={busy || locating}
                    onPress={changePickup}
                  />
                </View>
              ) : null}

              {destinationRequired && pickupConfirmed ? (
                <>
                  <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
                    {copy.mapDestination}
                  </AppText>
                  <TextField
                    ref={destinationInput}
                    accessibilityLabel={copy.mapDestination}
                    placeholder={copy.mapSearchPlaceholder}
                    value={destinationQuery}
                    onChangeText={onDestinationChange}
                    onFocus={() => {
                      setActivePin('destination');
                      setFocused('destination');
                      setMapPickMode(null);
                    }}
                    onBlur={onFieldBlur}
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    textContentType="none"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (suggestions.items[0]) {
                        applyPlace({ ...suggestions.items[0], source: 'manual_address' });
                      }
                    }}
                  />
                  <PressScale
                    accessibilityRole="button"
                    accessibilityState={{ selected: mapPickMode === 'destination' }}
                    disabled={busy || locating}
                    onPress={() => {
                      Keyboard.dismiss();
                      setActivePin('destination');
                      setFocused(null);
                      setMapPickMode((current) =>
                        current === 'destination' ? null : 'destination',
                      );
                    }}
                    style={[
                      styles.actionRow,
                      mapPickMode === 'destination' && styles.actionActive,
                    ]}
                  >
                    <Icon
                      name="search"
                      color={mapPickMode === 'destination' ? colors.accent : colors.text}
                    />
                    <AppText
                      variant="label"
                      color={mapPickMode === 'destination' ? colors.accent : colors.text}
                      style={styles.actionLabel}
                    >
                      {copy.pickOnMap}
                    </AppText>
                  </PressScale>
                  {mapPickMode === 'destination' ? (
                    <AppText variant="caption" color={colors.accent} style={styles.searchMessage}>
                      {copy.mapPickHintDestination}
                    </AppText>
                  ) : null}
                </>
              ) : null}

              {suggestions.searching ? (
                <View style={styles.searchingRow} accessibilityLabel={copy.mapSearching}>
                  <ActivityIndicator color={colors.accent} />
                  <AppText variant="caption" color={colors.muted}>
                    {copy.mapSearching}
                  </AppText>
                </View>
              ) : null}

              {suggestions.error ? (
                <AppText variant="caption" color={colors.error} style={styles.searchMessage}>
                  {suggestions.error}
                </AppText>
              ) : null}

              {suggestions.empty && !suggestions.searching ? (
                <AppText variant="caption" color={colors.muted} style={styles.searchMessage}>
                  {copy.mapNoResults}
                </AppText>
              ) : null}

              {suggestions.items.length > 0 ? (
                <View style={[styles.results, { maxHeight: suggestionMax }]}>
                  {suggestions.items.map((place) => (
                    <PressScale
                      key={`${place.lat}:${place.lng}:${place.label}`}
                      accessibilityRole="button"
                      onPress={() => applyPlace({ ...place, source: 'manual_address' })}
                      style={styles.result}
                    >
                      <AppText variant="caption">{place.label}</AppText>
                    </PressScale>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>

          {typing ? null : <View style={styles.flex} />}

          {typing ? null : (
            <View style={styles.bottomSheet}>
              {pickup && destination && route ? (
                <AppText variant="card" style={styles.summary}>
                  {formatRouteSummary(route.distanceMeters, route.durationSeconds)}
                </AppText>
              ) : null}
              {error ? (
                <AppText variant="caption" color={colors.error} style={styles.error}>
                  {error}
                </AppText>
              ) : null}
              {canContinue ? (
                <Button
                  label={copy.continue}
                  loading={busy}
                  disabled={busy || locating}
                  onPress={() => {
                    if (!pickup) {
                      return;
                    }
                    goToDetails(pickup, destination);
                  }}
                />
              ) : null}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topSheet: {
    marginHorizontal: space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadows.card,
  },
  hint: {
    marginTop: space.sm,
    marginBottom: space.md,
  },
  devBanner: {
    marginBottom: space.md,
  },
  fieldLabel: {
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  actionRow: {
    marginTop: space.sm,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  actionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionLabel: {
    flex: 1,
    flexShrink: 1,
  },
  confirmCard: {
    marginTop: space.md,
    gap: space.sm,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
  },
  searchMessage: {
    marginTop: space.md,
  },
  results: {
    marginTop: space.sm,
  },
  result: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bottomSheet: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadows.card,
  },
  summary: {
    textAlign: 'center',
  },
  error: {
    textAlign: 'center',
  },
});
