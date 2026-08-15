import type { GeoPlace, GeoProvider, GeoRoute } from './geo.provider';
import { isInUkraine, type LatLng } from './ukraine-bounds';

const PLACES: GeoPlace[] = [
  { label: 'Хрещатик, Київ', lat: 50.447, lng: 30.522 },
  { label: 'Площа Ринок, Львів', lat: 49.841, lng: 24.032 },
  { label: 'Дерибасівська, Одеса', lat: 46.484, lng: 30.732 },
];

const AVERAGE_SPEED_MPS = 11.1;

export class DevGeoProvider implements GeoProvider {
  async geocode(query: string): Promise<GeoPlace[]> {
    const normalized = query.trim().toLowerCase();
    return PLACES.filter(
      (place) =>
        isInUkraine(place) && place.label.toLowerCase().includes(normalized),
    );
  }

  async reverse(point: LatLng): Promise<GeoPlace | null> {
    if (!isInUkraine(point)) {
      return null;
    }

    const nearest = PLACES.reduce((best, place) =>
      haversineMeters(point, place) < haversineMeters(point, best) ? place : best,
    );
    return { label: nearest.label, lat: point.lat, lng: point.lng };
  }

  async route(origin: LatLng, destination: LatLng): Promise<GeoRoute> {
    const distanceMeters = Math.round(haversineMeters(origin, destination));
    return {
      distanceMeters,
      durationSeconds: Math.max(60, Math.round(distanceMeters / AVERAGE_SPEED_MPS)),
      polyline: [origin, midpoint(origin, destination), destination],
    };
  }
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const earthRadius = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
