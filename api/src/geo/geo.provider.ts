import type { LatLng } from './ukraine-bounds';

export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
};

export type GeoRoute = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: LatLng[];
};

export const GEO_PROVIDER = Symbol('GEO_PROVIDER');

export interface GeoProvider {
  geocode(query: string): Promise<GeoPlace[]>;
  reverse(point: LatLng): Promise<GeoPlace | null>;
  route(origin: LatLng, destination: LatLng): Promise<GeoRoute>;
}
