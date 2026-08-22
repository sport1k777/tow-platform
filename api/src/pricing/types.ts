import type { PricingCityCode } from './cities';

export const pricingServiceKeys = ['tow', 'moving', 'cargo', 'roadside'] as const;
export type PricingServiceKey = (typeof pricingServiceKeys)[number];

export const towVehicleCategories = [
  'car',
  'suv',
  'van',
  'truck',
  'motorcycle',
] as const;
export type TowVehicleCategory = (typeof towVehicleCategories)[number];

export const roadsideOptionKeys = [
  'battery',
  'fuel',
  'tire',
  'keys',
  'winch',
  'other',
] as const;
export type RoadsideOptionKey = (typeof roadsideOptionKeys)[number];

export const movingVolumeKeys = ['boxes', 'small', 'medium', 'large'] as const;
export type MovingVolumeKey = (typeof movingVolumeKeys)[number];

export const cargoClassKeys = ['van', 't15', 't35', 't5', 'truck'] as const;
export type CargoClassKey = (typeof cargoClassKeys)[number];

export type TariffConfig = {
  moverFeeKopiyky: number;
  floorFeeKopiyky: number;
  noElevatorFeeKopiyky: number;
  hourlyFeeKopiyky: number;
  outsideCityPerKmKopiyky: number;
  waitingFeeKopiyky: number;
  fuelSurchargeKopiyky: number;
  blockedWheelsFeeKopiyky: number;
  missingWheelsFeeKopiyky: number;
  accidentFeeKopiyky: number;
  equipmentFeeKopiyky: number;
};

export type PricingTariff = {
  id?: string;
  cityCode: PricingCityCode | null;
  serviceKey: PricingServiceKey;
  vehicleCategory: TowVehicleCategory | null;
  optionKey: string | null;
  baseFeeKopiyky: number;
  perKmKopiyky: number;
  minFeeKopiyky: number;
  nightMultiplierBps: number;
  weekendMultiplierBps: number;
  config: TariffConfig;
  active: boolean;
};

export type PriceLine = {
  code: string;
  label: string;
  amountKopiyky: number;
};

export type QuoteBreakdown = {
  serviceKey: PricingServiceKey;
  cityCode: PricingCityCode | null;
  lines: PriceLine[];
  totalKopiyky: number;
};

export type QuoteDetails = Record<string, unknown>;

export type PricingQuoteInput = {
  serviceKey: PricingServiceKey;
  pickupLabel: string;
  pickup: { lat: number; lng: number };
  destinationLabel?: string | null;
  destination?: { lat: number; lng: number } | null;
  distanceMeters: number;
  vehicleCategory?: string | null;
  details?: QuoteDetails;
  at?: Date;
  timeZone?: string;
};

export const defaultTariffConfig: TariffConfig = {
  moverFeeKopiyky: 40_000,
  floorFeeKopiyky: 6_000,
  noElevatorFeeKopiyky: 40_000,
  hourlyFeeKopiyky: 50_000,
  outsideCityPerKmKopiyky: 0,
  waitingFeeKopiyky: 3_000,
  fuelSurchargeKopiyky: 30_000,
  blockedWheelsFeeKopiyky: 20_000,
  missingWheelsFeeKopiyky: 30_000,
  accidentFeeKopiyky: 40_000,
  equipmentFeeKopiyky: 25_000,
};

export function parseTariffConfig(value: unknown): TariffConfig {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    moverFeeKopiyky: intOr(raw.moverFeeKopiyky, defaultTariffConfig.moverFeeKopiyky),
    floorFeeKopiyky: intOr(raw.floorFeeKopiyky, defaultTariffConfig.floorFeeKopiyky),
    noElevatorFeeKopiyky: intOr(
      raw.noElevatorFeeKopiyky,
      defaultTariffConfig.noElevatorFeeKopiyky,
    ),
    hourlyFeeKopiyky: intOr(raw.hourlyFeeKopiyky, defaultTariffConfig.hourlyFeeKopiyky),
    outsideCityPerKmKopiyky: intOr(
      raw.outsideCityPerKmKopiyky,
      defaultTariffConfig.outsideCityPerKmKopiyky,
    ),
    waitingFeeKopiyky: intOr(
      raw.waitingFeeKopiyky,
      defaultTariffConfig.waitingFeeKopiyky,
    ),
    fuelSurchargeKopiyky: intOr(
      raw.fuelSurchargeKopiyky,
      defaultTariffConfig.fuelSurchargeKopiyky,
    ),
    blockedWheelsFeeKopiyky: intOr(
      raw.blockedWheelsFeeKopiyky,
      defaultTariffConfig.blockedWheelsFeeKopiyky,
    ),
    missingWheelsFeeKopiyky: intOr(
      raw.missingWheelsFeeKopiyky,
      defaultTariffConfig.missingWheelsFeeKopiyky,
    ),
    accidentFeeKopiyky: intOr(
      raw.accidentFeeKopiyky,
      defaultTariffConfig.accidentFeeKopiyky,
    ),
    equipmentFeeKopiyky: intOr(
      raw.equipmentFeeKopiyky,
      defaultTariffConfig.equipmentFeeKopiyky,
    ),
  };
}

function intOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : fallback;
}
