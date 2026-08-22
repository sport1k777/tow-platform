import { copy } from '@/copy/uk';

import type { GeocodingProvider } from './geocoding.provider';
import { mockRoute, reverseMockPlace, searchMockPlaces } from './mock-locations';

/**
 * Local development geocoder. No network. Not Google/Mapbox/OSM.
 * Replace via createGeocodingProvider() when a real provider is connected.
 */
export class MockGeocodingProvider implements GeocodingProvider {
  readonly id = 'mock-geocoding';
  readonly mock = true;

  async geocode(query: string) {
    return { items: searchMockPlaces(query) };
  }

  autocomplete(query: string) {
    return this.geocode(query);
  }

  async reverseGeocode(lat: number, lng: number) {
    const place = reverseMockPlace(lat, lng);
    if (!place) {
      throw new Error(copy.mapOutsideUkraine);
    }
    return place;
  }

  async previewRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) {
    return mockRoute(origin, destination);
  }
}
