export type LatLng = {
  lat: number;
  lng: number;
};

/** Inclusive bounding box for Ukrainian territory (including Crimea). */
export const UA_BOUNDS = {
  minLat: 44.18,
  maxLat: 52.38,
  minLng: 22.14,
  maxLng: 40.23,
} as const;

export function isInUkraine(point: LatLng): boolean {
  return (
    point.lat >= UA_BOUNDS.minLat &&
    point.lat <= UA_BOUNDS.maxLat &&
    point.lng >= UA_BOUNDS.minLng &&
    point.lng <= UA_BOUNDS.maxLng
  );
}
