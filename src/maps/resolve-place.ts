import { copy } from '@/copy/uk';
import type { PickupSource } from '@/geo/pickup-source';
import { isInUkraine } from '@/geo/ukraine-bounds';

import type { GeoPlace } from '@/api/geo';

export function fallbackGpsPlace(
  lat: number,
  lng: number,
  source: PickupSource,
): GeoPlace {
  return {
    label: copy.gpsNoAddress,
    lat,
    lng,
    source,
  };
}

export function placeFromCoords(
  lat: number,
  lng: number,
  source: PickupSource,
  resolved?: GeoPlace | null,
): GeoPlace {
  if (!isInUkraine({ lat, lng })) {
    throw new Error(copy.mapOutsideUkraine);
  }
  if (!resolved?.label.trim()) {
    return fallbackGpsPlace(lat, lng, source);
  }
  return {
    label: resolved.label.trim(),
    lat,
    lng,
    source,
  };
}
