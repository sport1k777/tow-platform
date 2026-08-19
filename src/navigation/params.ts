import type { GeoPlace } from '@/api/geo';

export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parsePlaceParam(value: string | string[] | undefined): GeoPlace | null {
  const raw = firstParam(value);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GeoPlace>;
    if (
      typeof parsed.label === 'string' &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number'
    ) {
      return { label: parsed.label, lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    return null;
  }
  return null;
}
