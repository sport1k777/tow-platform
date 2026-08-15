import * as Location from 'expo-location';

export type ForegroundLocation =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'denied' | 'unavailable' };

export async function getForegroundLocation(): Promise<ForegroundLocation> {
  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
