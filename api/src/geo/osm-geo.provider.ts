import { isInUkraine, type LatLng } from './ukraine-bounds';
import type { GeoPlace, GeoProvider, GeoRoute } from './geo.provider';

type NominatimItem = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { coordinates?: Array<[number, number]> };
  }>;
};

export class OsmGeoProvider implements GeoProvider {
  constructor(
    private readonly nominatimUrl: string,
    private readonly osrmUrl: string,
    private readonly userAgent: string,
  ) {}

  async geocode(query: string): Promise<GeoPlace[]> {
    const url = new URL('/search', this.nominatimUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'ua');
    url.searchParams.set('limit', '5');

    const items = await this.fetchJson<NominatimItem[]>(url);
    return items
      .map(toPlace)
      .filter((place): place is GeoPlace => place !== null && isInUkraine(place));
  }

  async reverse(point: LatLng): Promise<GeoPlace | null> {
    const url = new URL('/reverse', this.nominatimUrl);
    url.searchParams.set('lat', String(point.lat));
    url.searchParams.set('lon', String(point.lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '18');

    const item = await this.fetchJson<NominatimItem>(url);
    const place = toPlace(item);
    if (!place || !isInUkraine(place)) {
      return null;
    }
    return place;
  }

  async route(origin: LatLng, destination: LatLng): Promise<GeoRoute> {
    const path = `/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = new URL(path, this.osrmUrl);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');

    const payload = await this.fetchJson<OsrmResponse>(url);
    const route = payload.routes?.[0];
    if (payload.code !== 'Ok' || !route) {
      throw new Error('No route found');
    }

    const polyline = (route.geometry?.coordinates ?? []).map(([lng, lat]) => ({
      lat,
      lng,
    }));

    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      polyline: polyline.length > 0 ? polyline : [origin, destination],
    };
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
      },
    });
    if (!response.ok) {
      throw new Error(`Geo provider request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }
}

function toPlace(item: NominatimItem | null | undefined): GeoPlace | null {
  if (!item?.lat || !item.lon || !item.display_name) {
    return null;
  }
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { label: item.display_name, lat, lng };
}
