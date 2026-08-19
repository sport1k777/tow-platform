import { calculateAmountKopiyky } from '../src/pricing/pricing.engine';

describe('calculateAmountKopiyky', () => {
  const rule = {
    baseFeeKopiyky: 50_000,
    perKmKopiyky: 2_500,
    minFeeKopiyky: 50_000,
  };

  it('uses base/min fee for pickup-only (0 km)', () => {
    expect(calculateAmountKopiyky(0, rule)).toBe(50_000);
  });

  it('adds ceil(km * per_km) to the base fee', () => {
    expect(calculateAmountKopiyky(1_500, rule)).toBe(53_750);
  });

  it('applies min fee when the computed amount is lower', () => {
    expect(
      calculateAmountKopiyky(0, {
        baseFeeKopiyky: 40_000,
        perKmKopiyky: 0,
        minFeeKopiyky: 45_000,
      }),
    ).toBe(45_000);
  });

  it('applies night and weekend multipliers in Europe/Kyiv', () => {
    const withMultipliers = {
      ...rule,
      nightMultiplierBps: 15_000,
      weekendMultiplierBps: 12_000,
    };
    const mondayNoon = new Date('2026-01-05T10:00:00Z');
    const mondayNight = new Date('2026-01-05T21:00:00Z');
    const saturdayNoon = new Date('2026-01-03T10:00:00Z');

    expect(calculateAmountKopiyky(0, withMultipliers, mondayNoon)).toBe(50_000);
    expect(calculateAmountKopiyky(0, withMultipliers, mondayNight)).toBe(75_000);
    expect(calculateAmountKopiyky(0, withMultipliers, saturdayNoon)).toBe(60_000);
  });
});
