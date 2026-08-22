import { fetchRoute, geocode, reverseGeocode } from '@/api/geo';

import type { GeocodingProvider } from './geocoding.provider';

/** Production path until a dedicated Maps SDK is connected: backend /geo/*. */
export class ApiGeocodingProvider implements GeocodingProvider {
  readonly id = 'api-geocoding';
  readonly mock = false;

  geocode(query: string, accessToken?: string) {
    if (!accessToken) {
      return Promise.reject(new Error('Geocoding requires an access token'));
    }
    return geocode(query, accessToken);
  }

  autocomplete(query: string, accessToken?: string) {
    return this.geocode(query, accessToken);
  }

  reverseGeocode(lat: number, lng: number, accessToken?: string) {
    if (!accessToken) {
      return Promise.reject(new Error('Geocoding requires an access token'));
    }
    return reverseGeocode(lat, lng, accessToken);
  }

  previewRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    accessToken?: string,
  ) {
    if (!accessToken) {
      return Promise.reject(new Error('Geocoding requires an access token'));
    }
    return fetchRoute(origin, destination, accessToken);
  }
}
