import type { Region } from 'react-native-maps';

import { defaultMapRegion } from '@/config/map';

export function regionForPlaces(points: { lat: number; lng: number }[]): Region {
  if (points.length === 0) {
    return defaultMapRegion;
  }
  if (points.length === 1) {
    return {
      latitude: points[0].lat,
      longitude: points[0].lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.02);
  const lngSpan = Math.max(maxLng - minLng, 0.02);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.min(latSpan * 1.7, 10),
    longitudeDelta: Math.min(lngSpan * 1.7, 10),
  };
}
