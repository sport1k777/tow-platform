import type { GeoPlace, GeoRoute } from '@/api/geo';
import { geocodingProvider } from '@/geo/create-geocoding-provider';

import { getForegroundLocation, type ForegroundLocation } from './location';

export type MapPlace = GeoPlace;
export type MapRoute = GeoRoute;

/**
 * Map/location adapter used by booking screens.
 * Geocoding is delegated to GeocodingProvider (mock in development).
 * Swap MockGeocodingProvider for a Google/Mapbox adapter in createGeocodingProvider().
 */
export const mapProvider = {
  id: geocodingProvider.id,
  mock: geocodingProvider.mock,
  getCurrentPosition(): Promise<ForegroundLocation> {
    return getForegroundLocation();
  },
  searchPlaces(query: string, accessToken?: string) {
    return geocodingProvider.geocode(query, accessToken);
  },
  autocompletePlaces(query: string, accessToken?: string) {
    return geocodingProvider.autocomplete(query, accessToken);
  },
  reverseGeocode(lat: number, lng: number, accessToken?: string) {
    return geocodingProvider.reverseGeocode(lat, lng, accessToken);
  },
  previewRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    accessToken?: string,
  ): Promise<MapRoute> {
    return geocodingProvider.previewRoute(origin, destination, accessToken);
  },
};

export type MapProvider = typeof mapProvider;
