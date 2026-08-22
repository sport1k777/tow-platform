import { ApiGeocodingProvider } from './api-geocoding.provider';
import type { GeocodingProvider } from './geocoding.provider';
import { MockGeocodingProvider } from './mock-geocoding.provider';

/**
 * EXPO_PUBLIC_GEO_PROVIDER=mock | api
 * Default: mock in __DEV__, API otherwise.
 * A Google/Mapbox Places adapter can implement autocomplete() later without changing screens.
 */
export function createGeocodingProvider(): GeocodingProvider {
  const mode = process.env.EXPO_PUBLIC_GEO_PROVIDER;
  if (mode === 'api') {
    return new ApiGeocodingProvider();
  }
  if (mode === 'mock' || __DEV__) {
    return new MockGeocodingProvider();
  }
  return new ApiGeocodingProvider();
}

export const geocodingProvider = createGeocodingProvider();
