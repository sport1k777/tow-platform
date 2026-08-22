import { detectCityCode, type PricingCityCode } from './cities';
import type { PricingQuoteInput, PricingTariff } from './types';

export type TariffLookup = {
  serviceKey: string;
  cityCode: PricingCityCode | null;
  vehicleCategory?: string | null;
  optionKey?: string | null;
};

export function optionKeyFromDetails(
  serviceKey: string,
  details?: Record<string, unknown>,
  vehicleCategory?: string | null,
): string | null {
  if (!details) {
    if (serviceKey === 'tow') {
      return null;
    }
    return null;
  }
  if (serviceKey === 'roadside') {
    return stringField(details.roadsideProblem);
  }
  if (serviceKey === 'moving') {
    return stringField(details.movingVolume);
  }
  if (serviceKey === 'cargo') {
    return stringField(details.cargoClass);
  }
  if (serviceKey === 'tow') {
    return stringField(details.towVehicle) ?? vehicleCategory ?? null;
  }
  return null;
}

export function lookupFromQuoteInput(input: PricingQuoteInput): TariffLookup {
  const cityCode = detectCityCode(input.pickupLabel, input.pickup);
  const vehicle =
    input.serviceKey === 'tow'
      ? (stringField(input.details?.towVehicle) ?? input.vehicleCategory ?? null)
      : null;
  return {
    serviceKey: input.serviceKey,
    cityCode,
    vehicleCategory: vehicle,
    optionKey: optionKeyFromDetails(input.serviceKey, input.details, vehicle),
  };
}

/**
 * Prefer a city + service + vehicle/option match. Never return a tariff for a
 * different service, even as a fallback.
 */
export function pickTariff(
  tariffs: readonly PricingTariff[],
  lookup: TariffLookup,
): PricingTariff | null {
  let best: { tariff: PricingTariff; score: number } | null = null;
  for (const tariff of tariffs) {
    if (!tariff.active || tariff.serviceKey !== lookup.serviceKey) {
      continue;
    }
    if (tariff.cityCode && tariff.cityCode !== lookup.cityCode) {
      continue;
    }
    if (tariff.vehicleCategory && tariff.vehicleCategory !== lookup.vehicleCategory) {
      continue;
    }
    if (tariff.optionKey && tariff.optionKey !== lookup.optionKey) {
      continue;
    }
    const score =
      (tariff.cityCode ? 8 : 0) +
      (tariff.vehicleCategory ? 4 : 0) +
      (tariff.optionKey ? 4 : 0);
    if (!best || score > best.score) {
      best = { tariff, score };
    }
  }
  return best?.tariff ?? null;
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
