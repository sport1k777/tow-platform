import type { GeoPlace, GeoProvider, GeoRoute } from './geo.provider';
import { mockDevRoute, reverseDevPlace, searchDevPlaces } from './dev-places';
import { isInUkraine, type LatLng } from './ukraine-bounds';

/**
 * Development geocoder/router. No Google/Mapbox/OSM.
 * Swap via GEO_PROVIDER (createGeoProvider) when a real adapter is connected.
 */
export class DevGeoProvider implements GeoProvider {
  async geocode(query: string): Promise<GeoPlace[]> {
    return searchDevPlaces(query);
  }

  async reverse(point: LatLng): Promise<GeoPlace | null> {
    return reverseDevPlace(point);
  }

  async route(origin: LatLng, destination: LatLng): Promise<GeoRoute> {
    if (!isInUkraine(origin) || !isInUkraine(destination)) {
      throw new Error('Only locations in Ukraine are allowed');
    }
    return mockDevRoute(origin, destination);
  }
}

export { haversineMeters } from './dev-places';
