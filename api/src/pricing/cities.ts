export const pricingCityCodes = [
  'kyiv',
  'rivne',
  'zhytomyr',
  'lviv',
  'odesa',
  'dnipro',
  'khmelnytskyi',
] as const;

export type PricingCityCode = (typeof pricingCityCodes)[number];

export type PricingCity = {
  code: PricingCityCode;
  nameUk: string;
  aliases: string[];
  lat: number;
  lng: number;
};

/**
 * Named Ukrainian tariffs. Additional cities can be added here and as
 * `pricing_rules.city_code` rows without changing quote UI.
 */
export const pricingCities: readonly PricingCity[] = [
  {
    code: 'kyiv',
    nameUk: 'Київ',
    aliases: ['київ', 'киев', 'kyiv', 'kiev'],
    lat: 50.4501,
    lng: 30.5234,
  },
  {
    code: 'rivne',
    nameUk: 'Рівне',
    aliases: ['рівне', 'ровно', 'rivne', 'rovno'],
    lat: 50.6199,
    lng: 26.2516,
  },
  {
    code: 'zhytomyr',
    nameUk: 'Житомир',
    aliases: ['житомир', 'zhytomyr', 'zhitomir'],
    lat: 50.2547,
    lng: 28.6587,
  },
  {
    code: 'lviv',
    nameUk: 'Львів',
    aliases: ['львів', 'львов', 'lviv', 'lvov'],
    lat: 49.8397,
    lng: 24.0297,
  },
  {
    code: 'odesa',
    nameUk: 'Одеса',
    aliases: ['одеса', 'одесса', 'odesa', 'odessa'],
    lat: 46.4825,
    lng: 30.7233,
  },
  {
    code: 'dnipro',
    nameUk: 'Дніпро',
    aliases: ['дніпро', 'днепр', 'dnipro', 'dnepr'],
    lat: 48.4647,
    lng: 35.0462,
  },
  {
    code: 'khmelnytskyi',
    nameUk: 'Хмельницький',
    aliases: ['хмельницький', 'хмельницкий', 'khmelnytskyi', 'khmelnitsky'],
    lat: 49.4229,
    lng: 26.9871,
  },
];

const aliasToCode = new Map<string, PricingCityCode>();
for (const city of pricingCities) {
  aliasToCode.set(normalize(city.nameUk), city.code);
  for (const alias of city.aliases) {
    aliasToCode.set(normalize(alias), city.code);
  }
}

export function isPricingCityCode(value: string | undefined | null): value is PricingCityCode {
  return pricingCityCodes.includes(value as PricingCityCode);
}

export function detectCityCode(
  label?: string | null,
  coords?: { lat: number; lng: number } | null,
): PricingCityCode | null {
  if (label) {
    const haystack = normalize(label);
    for (const [alias, code] of aliasToCode) {
      if (haystack.includes(alias)) {
        return code;
      }
    }
  }
  if (coords) {
    let best: { code: PricingCityCode; dist: number } | null = null;
    for (const city of pricingCities) {
      const dist = haversineKm(coords, city);
      if (dist > 45) {
        continue;
      }
      if (!best || dist < best.dist) {
        best = { code: city.code, dist };
      }
    }
    return best?.code ?? null;
  }
  return null;
}

export function cityNameUk(code: string | null | undefined): string {
  const city = pricingCities.find((item) => item.code === code);
  return city?.nameUk ?? 'Місто за замовчуванням';
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll('’', "'");
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
