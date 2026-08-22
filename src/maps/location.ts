import * as Location from 'expo-location';

export const LOCATION_TIMEOUT_MS = 15_000;

export type LocationFailure = 'denied' | 'disabled' | 'timeout' | 'unavailable';

export type ForegroundLocation =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: LocationFailure };

export async function getForegroundLocation(): Promise<ForegroundLocation> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      return { ok: false, reason: 'disabled' };
    }

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
      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        LOCATION_TIMEOUT_MS,
      );
      return {
        ok: true,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 120_000,
        requiredAccuracy: 250,
      });
      if (last) {
        return {
          ok: true,
          lat: last.coords.latitude,
          lng: last.coords.longitude,
        };
      }
      return { ok: false, reason: isTimeout(error) ? 'timeout' : 'unavailable' };
    }
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('location-timeout'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|location-timeout/i.test(message);
}
