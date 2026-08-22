import type { GeoPlace, GeoRoute } from '@/api/geo';

export type MockCity = {
  city: string;
  oblast: string;
  aliases: string[];
  lat: number;
  lng: number;
  streets: string[];
};

/** Development-only Ukrainian fixtures. Not a production gazetteer. */
export const MOCK_CITIES: MockCity[] = [
  {
    city: 'Київ',
    oblast: 'Україна',
    aliases: ['київ', 'киев', 'kyiv', 'kiev'],
    lat: 50.4501,
    lng: 30.5234,
    streets: ['вул. Хрещатик, 1', 'вул. Хрещатик, 22', 'вул. Велика Васильківська, 1'],
  },
  {
    city: 'Рівне',
    oblast: 'Рівненська область',
    aliases: ['рівне', 'ровно', 'rivne', 'rovno'],
    lat: 50.6199,
    lng: 26.2516,
    streets: ['вул. Соборна, 1', 'вул. Соборна, 16', 'вул. Київська, 8'],
  },
  {
    city: 'Львів',
    oblast: 'Львівська область',
    aliases: ['львів', 'львов', 'lviv', 'lvov'],
    lat: 49.8397,
    lng: 24.0297,
    streets: ['пл. Ринок, 1', 'вул. Галицька, 1'],
  },
  {
    city: 'Житомир',
    oblast: 'Житомирська область',
    aliases: ['житомир', 'zhytomyr', 'zhitomir'],
    lat: 50.2547,
    lng: 28.6587,
    streets: ['вул. Михайлівська, 1', 'вул. Київська, 1'],
  },
  {
    city: 'Одеса',
    oblast: 'Одеська область',
    aliases: ['одеса', 'одесса', 'odesa', 'odessa'],
    lat: 46.4825,
    lng: 30.7233,
    streets: ['вул. Дерибасівська, 1', 'вул. Дерибасівська, 12'],
  },
  {
    city: 'Дніпро',
    oblast: 'Дніпропетровська область',
    aliases: ['дніпро', 'днепр', 'dnipro', 'dnepr'],
    lat: 48.4647,
    lng: 35.0462,
    streets: ['пр. Дмитра Яворницького, 1', 'вул. Короленка, 1'],
  },
  {
    city: 'Харків',
    oblast: 'Харківська область',
    aliases: ['харків', 'харьков', 'kharkiv', 'kharkov'],
    lat: 49.9935,
    lng: 36.2304,
    streets: ['пр. Науки, 1', 'вул. Сумська, 1'],
  },
  {
    city: 'Вінниця',
    oblast: 'Вінницька область',
    aliases: ['вінниця', 'винница', 'vinnytsia', 'vinnitsa'],
    lat: 49.2331,
    lng: 28.4682,
    streets: ['вул. Соборна, 1', 'вул. Соборна, 24'],
  },
];

const AVERAGE_SPEED_MPS = 11.1;

export function normalizeGeoQuery(value: string): string {
  return value.trim().toLowerCase().replace(/[’']/g, '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ');
}

export function searchMockPlaces(query: string): GeoPlace[] {
  const raw = query.trim();
  if (raw.length < 2) {
    return [];
  }
  const normalized = normalizeGeoQuery(raw);
  const results: GeoPlace[] = [];

  for (const city of MOCK_CITIES) {
    const aliases = [normalizeGeoQuery(city.city), ...city.aliases.map(normalizeGeoQuery)];
    const cityHit = aliases.some(
      (alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized),
    );
    const rest = stripCity(normalized, aliases);
    const matchingStreets = city.streets.filter((street) =>
      streetMatches(normalizeGeoQuery(street), rest, normalized, cityHit),
    );
    if (!cityHit && matchingStreets.length === 0) {
      continue;
    }

    if (!rest) {
      results.push({
        label: `${city.city}, ${city.oblast}`,
        lat: city.lat,
        lng: city.lng,
      });
      for (const street of city.streets) {
        results.push(placeFor(city, `${city.city}, ${street}`, street));
      }
      continue;
    }

    for (const street of matchingStreets) {
      results.push(placeFor(city, `${city.city}, ${street}`, street));
    }
    if (matchingStreets.length === 0 && cityHit) {
      const formatted = aliases.some((alias) => normalized.includes(alias))
        ? collapseSpaces(raw)
        : `${city.city}, ${collapseSpaces(raw)}`;
      results.push(placeFor(city, formatted, rest));
    }
  }

  return uniquePlaces(results).slice(0, 8);
}

function streetMatches(
  streetNorm: string,
  rest: string,
  query: string,
  cityHit: boolean,
): boolean {
  if (!rest) {
    return cityHit;
  }
  const tokens = rest.split(' ').filter((token) => token.length > 1);
  if (tokens.length === 0) {
    return cityHit;
  }
  return tokens.every((token) => streetNorm.includes(token) || query.includes(streetNorm));
}

const UA_BOUNDS = {
  minLat: 44.18,
  maxLat: 52.38,
  minLng: 22.14,
  maxLng: 40.23,
} as const;

export function isMockPointInUkraine(lat: number, lng: number): boolean {
  return (
    lat >= UA_BOUNDS.minLat &&
    lat <= UA_BOUNDS.maxLat &&
    lng >= UA_BOUNDS.minLng &&
    lng <= UA_BOUNDS.maxLng
  );
}

export function reverseMockPlace(lat: number, lng: number): GeoPlace | null {
  if (!isMockPointInUkraine(lat, lng) || MOCK_CITIES.length === 0) {
    return null;
  }
  const nearest = MOCK_CITIES.reduce((best, city) =>
    haversineMeters({ lat, lng }, city) < haversineMeters({ lat, lng }, best) ? city : best,
  );
  const distance = haversineMeters({ lat, lng }, nearest);
  if (distance > 25_000) {
    return null;
  }
  const label =
    distance > 3_000
      ? `${nearest.city}, ${nearest.oblast}`
      : `${nearest.city}, ${nearest.streets[0]}`;
  return { label, lat, lng };
}

export function mockRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): GeoRoute {
  const distanceMeters = Math.round(haversineMeters(origin, destination));
  return {
    distanceMeters,
    durationSeconds: Math.max(60, Math.round(distanceMeters / AVERAGE_SPEED_MPS)),
    polyline: [
      origin,
      {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
      },
      destination,
    ],
  };
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadius = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function placeFor(city: MockCity, label: string, salt = label): GeoPlace {
  const offset = deterministicOffset(salt);
  return {
    label,
    lat: Number((city.lat + offset.lat).toFixed(6)),
    lng: Number((city.lng + offset.lng).toFixed(6)),
  };
}

function stripCity(query: string, aliases: string[]): string {
  let rest = query;
  const sorted = [...aliases].sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (rest === alias) {
      return '';
    }
    if (rest.startsWith(`${alias} `)) {
      rest = rest.slice(alias.length).trim();
      break;
    }
  }
  return rest;
}

function deterministicOffset(key: string): { lat: number; lng: number } {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return {
    lat: ((hash % 180) - 90) * 0.00005,
    lng: (((hash / 180) % 180) - 90) * 0.00007,
  };
}

function uniquePlaces(items: GeoPlace[]): GeoPlace[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}:${item.lat}:${item.lng}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
