import { apiRequest } from './client';

export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
};

export type GeoRoute = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: { lat: number; lng: number }[];
};

export function geocode(query: string, accessToken: string) {
  return apiRequest<{ items: GeoPlace[] }>('/geo/geocode', {
    method: 'POST',
    accessToken,
    body: { query },
  });
}

export function reverseGeocode(lat: number, lng: number, accessToken: string) {
  return apiRequest<GeoPlace>('/geo/reverse', {
    method: 'POST',
    accessToken,
    body: { lat, lng },
  });
}

export function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  accessToken: string,
) {
  return apiRequest<GeoRoute>('/geo/route', {
    method: 'POST',
    accessToken,
    body: { origin, destination },
  });
}
