import { pricingCities, type PricingCityCode } from './cities';
import {
  defaultTariffConfig,
  type CargoClassKey,
  type MovingVolumeKey,
  type PricingTariff,
  type RoadsideOptionKey,
  type TariffConfig,
  type TowVehicleCategory,
} from './types';

/**
 * Initial market-oriented test tariffs in kopiyky. Admin upserts replace these
 * for future quotes without an app rebuild.
 */
const TOW_BENCHMARK: Record<
  TowVehicleCategory,
  { base: number; perKm: number }
> = {
  car: { base: 80_000, perKm: 2_000 },
  suv: { base: 90_000, perKm: 2_300 },
  van: { base: 100_000, perKm: 2_500 },
  truck: { base: 200_000, perKm: 3_000 },
  motorcycle: { base: 60_000, perKm: 1_500 },
};

const ROADSIDE_BENCHMARK: Record<RoadsideOptionKey, number> = {
  battery: 50_000,
  fuel: 50_000,
  tire: 50_000,
  keys: 70_000,
  winch: 150_000,
  other: 50_000,
};

const MOVING_BENCHMARK: Record<
  MovingVolumeKey,
  { base: number; perKm: number }
> = {
  boxes: { base: 80_000, perKm: 1_500 },
  small: { base: 120_000, perKm: 1_800 },
  medium: { base: 150_000, perKm: 2_000 },
  large: { base: 250_000, perKm: 2_400 },
};

const CARGO_BENCHMARK: Record<CargoClassKey, { base: number; perKm: number; hourly: number }> =
  {
    van: { base: 90_000, perKm: 1_800, hourly: 50_000 },
    t15: { base: 120_000, perKm: 2_200, hourly: 60_000 },
    t35: { base: 160_000, perKm: 2_600, hourly: 75_000 },
    t5: { base: 220_000, perKm: 3_200, hourly: 95_000 },
    truck: { base: 300_000, perKm: 3_800, hourly: 120_000 },
  };

/** Relative to Kyiv. Extra cities can be added without changing quote formulas. */
export const cityTariffScale: Record<PricingCityCode, number> = {
  kyiv: 1,
  lviv: 0.95,
  odesa: 0.95,
  dnipro: 0.92,
  zhytomyr: 0.88,
  rivne: 0.85,
  khmelnytskyi: 0.85,
};

function scaleKopiyky(amount: number, city: PricingCityCode | null): number {
  const factor = city ? cityTariffScale[city] : 1;
  return Math.round(amount * factor);
}

function row(partial: Omit<PricingTariff, 'active' | 'nightMultiplierBps' | 'weekendMultiplierBps' | 'config'> & {
  config?: Partial<TariffConfig>;
}): PricingTariff {
  return {
    ...partial,
    nightMultiplierBps: 10_000,
    weekendMultiplierBps: 10_000,
    config: { ...defaultTariffConfig, ...partial.config },
    active: true,
  };
}

function forCities(build: (city: PricingCityCode | null) => PricingTariff[]): PricingTariff[] {
  const cities: Array<PricingCityCode | null> = [null, ...pricingCities.map((city) => city.code)];
  return cities.flatMap(build);
}

export function buildDefaultTariffs(): PricingTariff[] {
  const tow = forCities((city) =>
    (Object.keys(TOW_BENCHMARK) as TowVehicleCategory[]).map((vehicle) => {
      const spec = TOW_BENCHMARK[vehicle];
      const perKm = scaleKopiyky(spec.perKm, city);
      return row({
        cityCode: city,
        serviceKey: 'tow',
        vehicleCategory: vehicle,
        optionKey: null,
        baseFeeKopiyky: scaleKopiyky(spec.base, city),
        perKmKopiyky: perKm,
        minFeeKopiyky: scaleKopiyky(spec.base, city),
        config: { outsideCityPerKmKopiyky: Math.round(perKm * 1.25) },
      });
    }),
  );

  const roadside = forCities((city) =>
    (Object.keys(ROADSIDE_BENCHMARK) as RoadsideOptionKey[]).map((option) =>
      row({
        cityCode: city,
        serviceKey: 'roadside',
        vehicleCategory: null,
        optionKey: option,
        baseFeeKopiyky: scaleKopiyky(ROADSIDE_BENCHMARK[option], city),
        perKmKopiyky: 0,
        minFeeKopiyky: scaleKopiyky(ROADSIDE_BENCHMARK[option], city),
      }),
    ),
  );

  const moving = forCities((city) =>
    (Object.keys(MOVING_BENCHMARK) as MovingVolumeKey[]).map((volume) => {
      const spec = MOVING_BENCHMARK[volume];
      return row({
        cityCode: city,
        serviceKey: 'moving',
        vehicleCategory: null,
        optionKey: volume,
        baseFeeKopiyky: scaleKopiyky(spec.base, city),
        perKmKopiyky: scaleKopiyky(spec.perKm, city),
        minFeeKopiyky: scaleKopiyky(spec.base, city),
        config: {
          moverFeeKopiyky: scaleKopiyky(40_000, city),
          floorFeeKopiyky: scaleKopiyky(6_000, city),
          noElevatorFeeKopiyky: scaleKopiyky(40_000, city),
        },
      });
    }),
  );

  const cargo = forCities((city) =>
    (Object.keys(CARGO_BENCHMARK) as CargoClassKey[]).map((cargoClass) => {
      const spec = CARGO_BENCHMARK[cargoClass];
      return row({
        cityCode: city,
        serviceKey: 'cargo',
        vehicleCategory: null,
        optionKey: cargoClass,
        baseFeeKopiyky: scaleKopiyky(spec.base, city),
        perKmKopiyky: scaleKopiyky(spec.perKm, city),
        minFeeKopiyky: scaleKopiyky(spec.base, city),
        config: {
          hourlyFeeKopiyky: scaleKopiyky(spec.hourly, city),
          moverFeeKopiyky: scaleKopiyky(40_000, city),
        },
      });
    }),
  );

  const fallbacks: PricingTariff[] = [
    row({
      cityCode: null,
      serviceKey: 'tow',
      vehicleCategory: null,
      optionKey: null,
      baseFeeKopiyky: TOW_BENCHMARK.car.base,
      perKmKopiyky: TOW_BENCHMARK.car.perKm,
      minFeeKopiyky: TOW_BENCHMARK.car.base,
      config: { outsideCityPerKmKopiyky: Math.round(TOW_BENCHMARK.car.perKm * 1.25) },
    }),
    row({
      cityCode: null,
      serviceKey: 'roadside',
      vehicleCategory: null,
      optionKey: null,
      baseFeeKopiyky: ROADSIDE_BENCHMARK.other,
      perKmKopiyky: 0,
      minFeeKopiyky: ROADSIDE_BENCHMARK.other,
    }),
    row({
      cityCode: null,
      serviceKey: 'moving',
      vehicleCategory: null,
      optionKey: null,
      baseFeeKopiyky: MOVING_BENCHMARK.medium.base,
      perKmKopiyky: MOVING_BENCHMARK.medium.perKm,
      minFeeKopiyky: MOVING_BENCHMARK.medium.base,
    }),
    row({
      cityCode: null,
      serviceKey: 'cargo',
      vehicleCategory: null,
      optionKey: null,
      baseFeeKopiyky: CARGO_BENCHMARK.van.base,
      perKmKopiyky: CARGO_BENCHMARK.van.perKm,
      minFeeKopiyky: CARGO_BENCHMARK.van.base,
      config: { hourlyFeeKopiyky: CARGO_BENCHMARK.van.hourly },
    }),
  ];

  return [...tow, ...roadside, ...moving, ...cargo, ...fallbacks];
}

export const defaultTariffs: PricingTariff[] = buildDefaultTariffs();
