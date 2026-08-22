import { DevGeoProvider, haversineMeters } from '../src/geo/dev-geo.provider';
import { reverseDevPlace } from '../src/geo/dev-places';
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
    expect(items[0].label.toLowerCase()).toContain('київ');
    expect(items[0].label).toContain('Україна');
  });

  it('geocodes Rivne and a street-style address', async () => {
    const city = await geo.geocode('Рівне');
    expect(city.length).toBeGreaterThan(0);
    expect(city[0].label).toBe('Рівне, Рівненська область');
    expect(isInUkraine(city[0])).toBe(true);

    const street = await geo.geocode('Рівне, Соборна');
    expect(street.length).toBeGreaterThan(0);
    expect(street.every((item) => /Соборна/i.test(item.label))).toBe(true);
    expect(street[0].lat).toBeGreaterThan(50);
    expect(street[0].lng).toBeGreaterThan(26);
  });

  it('geocodes Kyiv Khreshchatyk and Zhytomyr', async () => {
    const khreshchatyk = await geo.geocode('Київ, Хрещатик');
    expect(khreshchatyk.length).toBeGreaterThan(0);
    expect(khreshchatyk[0].label).toMatch(/Хрещатик/);

    const zhytomyr = await geo.geocode('Житомир');
    expect(zhytomyr[0].label).toBe('Житомир, Житомирська область');
  });

  it('returns a route with distance and polyline', async () => {
    const origin = { lat: 50.447, lng: 30.522 };
    const destination = { lat: 49.841, lng: 24.032 };
    const route = await geo.route(origin, destination);

    expect(route.distanceMeters).toBe(Math.round(haversineMeters(origin, destination)));
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.polyline.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a far-from-city Ukraine point without inventing a street', () => {
    const highway = { lat: 51.12, lng: 26.88 };
    expect(isInUkraine(highway)).toBe(true);
    expect(reverseDevPlace(highway)).toBeNull();
  });
});
