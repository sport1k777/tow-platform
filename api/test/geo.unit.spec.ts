import { DevGeoProvider, haversineMeters } from '../src/geo/dev-geo.provider';
import { isInUkraine } from '../src/geo/ukraine-bounds';

describe('isInUkraine', () => {
  it('accepts a Kyiv coordinate', () => {
    expect(isInUkraine({ lat: 50.45, lng: 30.52 })).toBe(true);
  });

  it('rejects a Warsaw coordinate', () => {
    expect(isInUkraine({ lat: 52.23, lng: 21.01 })).toBe(false);
  });
});

describe('DevGeoProvider', () => {
  const geo = new DevGeoProvider();

  it('geocodes a Ukrainian place name', async () => {
    const items = await geo.geocode('Київ');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => isInUkraine(item))).toBe(true);
  });

  it('returns a route with distance and polyline', async () => {
    const origin = { lat: 50.447, lng: 30.522 };
    const destination = { lat: 49.841, lng: 24.032 };
    const route = await geo.route(origin, destination);

    expect(route.distanceMeters).toBe(Math.round(haversineMeters(origin, destination)));
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.polyline.length).toBeGreaterThanOrEqual(2);
  });
});
