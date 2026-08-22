import type { GeoPlace, GeoRoute } from '@/api/geo';

export interface GeocodingProvider {
  readonly id: string;
  /** True only for development fixtures. Never treat this as production geocoding. */
  readonly mock: boolean;
  geocode(query: string, accessToken?: string): Promise<{ items: GeoPlace[] }>;
  /**
   * Place predictions while the user types. Production adapters can call
   * Google Places Autocomplete here. Current mock/API providers reuse geocode.
   */
  autocomplete(query: string, accessToken?: string): Promise<{ items: GeoPlace[] }>;
  reverseGeocode(lat: number, lng: number, accessToken?: string): Promise<GeoPlace>;
  previewRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    accessToken?: string,
  ): Promise<GeoRoute>;
}
