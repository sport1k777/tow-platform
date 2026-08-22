import { defaultTariffs } from '../src/pricing/catalog';
import { detectCityCode } from '../src/pricing/cities';
import { lookupFromQuoteInput, pickTariff } from '../src/pricing/lookup';
import { MockPricingProvider } from '../src/pricing/mock-pricing.provider';
import {
  calculateAmountKopiyky,
  calculateServiceQuote,
} from '../src/pricing/pricing.engine';
import type { PricingQuoteInput, PricingTariff } from '../src/pricing/types';

const KYIV = { lat: 50.447, lng: 30.522, label: 'Хрещатик, Київ' };
const KYIV_B = { lat: 50.45, lng: 30.52, label: 'Майдан Незалежності, Київ' };
const RIVNE = { lat: 50.6199, lng: 26.2516, label: 'вул. Соборна, Рівне' };
const WEEKDAY = new Date('2026-01-05T10:00:00Z');
const KM20 = 20_000;

function quote(input: Omit<PricingQuoteInput, 'at'>): ReturnType<typeof calculateServiceQuote> {
  const full: PricingQuoteInput = { ...input, at: WEEKDAY };
  const tariff = pickTariff(defaultTariffs, lookupFromQuoteInput(full));
  if (!tariff) {
    throw new Error(`No tariff for ${input.serviceKey}`);
  }
  return calculateServiceQuote(full, tariff);
}

function withTariff(
  input: Omit<PricingQuoteInput, 'at'>,
  patch: Partial<PricingTariff>,
) {
  const full: PricingQuoteInput = { ...input, at: WEEKDAY };
  const base = pickTariff(defaultTariffs, lookupFromQuoteInput(full));
  if (!base) {
    throw new Error('missing base tariff');
  }
  return calculateServiceQuote(full, { ...base, ...patch, config: { ...base.config, ...patch.config } });
}

describe('service-specific pricing engine', () => {
  it('detects Ukrainian city codes from labels', () => {
    expect(detectCityCode('Хрещатик, Київ')).toBe('kyiv');
    expect(detectCityCode('Площа Ринок, Львів')).toBe('lviv');
    expect(detectCityCode('Соборна, Рівне')).toBe('rivne');
  });

  it('never prices moving with the evacuator model', () => {
    const tow = quote({
      serviceKey: 'tow',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      vehicleCategory: 'car',
      details: { towVehicle: 'car' },
    });
    const moving = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: true, floor: 1 },
    });
    expect(tow.serviceKey).toBe('tow');
    expect(moving.serviceKey).toBe('moving');
    expect(tow.totalKopiyky).not.toBe(moving.totalKopiyky);
    expect(pickTariff(defaultTariffs, { serviceKey: 'moving', cityCode: 'kyiv', optionKey: 'medium' })?.serviceKey).toBe(
      'moving',
    );
  });

  it('changes moving price when elevator availability changes', () => {
    const withLift = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: true, floor: 5 },
    });
    const withoutLift = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: false, floor: 5 },
    });
    expect(withoutLift.totalKopiyky).toBeGreaterThan(withLift.totalKopiyky);
  });

  it('changes moving price when floor changes', () => {
    const floor1 = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: false, floor: 1 },
    });
    const floor5 = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: false, floor: 5 },
    });
    expect(floor5.totalKopiyky).toBeGreaterThan(floor1.totalKopiyky);
  });

  it('changes moving price when the number of movers changes', () => {
    const two = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: true, floor: 1 },
    });
    const four = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 4, lift: true, floor: 1 },
    });
    expect(four.totalKopiyky).toBeGreaterThan(two.totalKopiyky);
  });

  it('changes freight price when vehicle class changes', () => {
    const van = quote({
      serviceKey: 'cargo',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { cargoClass: 'van' },
    });
    const truck = quote({
      serviceKey: 'cargo',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { cargoClass: 'truck' },
    });
    expect(truck.totalKopiyky).toBeGreaterThan(van.totalKopiyky);
    expect(pickTariff(defaultTariffs, { serviceKey: 'cargo', cityCode: 'kyiv', optionKey: 'truck' })?.serviceKey).toBe(
      'cargo',
    );
  });

  it('changes roadside price when the assistance type changes', () => {
    const battery = quote({
      serviceKey: 'roadside',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      distanceMeters: 0,
      details: { roadsideProblem: 'battery' },
    });
    const winch = quote({
      serviceKey: 'roadside',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      distanceMeters: 0,
      details: { roadsideProblem: 'winch' },
    });
    const keys = quote({
      serviceKey: 'roadside',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      distanceMeters: 0,
      details: { roadsideProblem: 'keys' },
    });
    expect(battery.totalKopiyky).toBe(50_000);
    expect(keys.totalKopiyky).toBe(70_000);
    expect(winch.totalKopiyky).toBe(150_000);
  });

  it('applies a different city tariff for the same service', () => {
    const kyiv = quote({
      serviceKey: 'roadside',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      distanceMeters: 0,
      details: { roadsideProblem: 'battery' },
    });
    const rivne = quote({
      serviceKey: 'roadside',
      pickupLabel: RIVNE.label,
      pickup: RIVNE,
      distanceMeters: 0,
      details: { roadsideProblem: 'battery' },
    });
    expect(kyiv.cityCode).toBe('kyiv');
    expect(rivne.cityCode).toBe('rivne');
    expect(rivne.totalKopiyky).toBeLessThan(kyiv.totalKopiyky);
  });

  it('adds a distance line for distance-based services', () => {
    const short = quote({
      serviceKey: 'tow',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: 5_000,
      vehicleCategory: 'car',
      details: { towVehicle: 'car' },
    });
    const long = quote({
      serviceKey: 'tow',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      vehicleCategory: 'car',
      details: { towVehicle: 'car' },
    });
    expect(long.totalKopiyky).toBeGreaterThan(short.totalKopiyky);
    expect(long.lines.some((line) => line.code === 'distance')).toBe(true);
    expect(long.totalKopiyky).toBe(80_000 + 40_000);
  });

  it('respects the minimum order price', () => {
    const priced = withTariff(
      {
        serviceKey: 'tow',
        pickupLabel: KYIV.label,
        pickup: KYIV,
        destinationLabel: KYIV_B.label,
        destination: KYIV_B,
        distanceMeters: 0,
        vehicleCategory: 'car',
        details: { towVehicle: 'car' },
      },
      { baseFeeKopiyky: 40_000, minFeeKopiyky: 90_000, perKmKopiyky: 0 },
    );
    expect(priced.totalKopiyky).toBe(90_000);
    expect(priced.lines.some((line) => line.code === 'minimum')).toBe(true);
  });

  it('uses admin-configured tariff values for future quotes', () => {
    const seeded = quote({
      serviceKey: 'tow',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: 0,
      vehicleCategory: 'car',
      details: { towVehicle: 'car' },
    });
    const admin = withTariff(
      {
        serviceKey: 'tow',
        pickupLabel: KYIV.label,
        pickup: KYIV,
        destinationLabel: KYIV_B.label,
        destination: KYIV_B,
        distanceMeters: 0,
        vehicleCategory: 'car',
        details: { towVehicle: 'car' },
      },
      { baseFeeKopiyky: 123_400, minFeeKopiyky: 123_400 },
    );
    expect(seeded.totalKopiyky).toBe(80_000);
    expect(admin.totalKopiyky).toBe(123_400);
  });

  it('does not let one service fall back to another service tariff', () => {
    const onlyTow: PricingTariff[] = defaultTariffs.filter((row) => row.serviceKey === 'tow');
    expect(pickTariff(onlyTow, { serviceKey: 'moving', cityCode: 'kyiv', optionKey: 'medium' })).toBeNull();
    expect(pickTariff(onlyTow, { serviceKey: 'cargo', cityCode: 'kyiv', optionKey: 'van' })).toBeNull();
    expect(pickTariff(onlyTow, { serviceKey: 'roadside', cityCode: 'kyiv', optionKey: 'battery' })).toBeNull();
  });

  it('keeps a customer-readable breakdown that includes the total', () => {
    const moving = quote({
      serviceKey: 'moving',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      destinationLabel: KYIV_B.label,
      destination: KYIV_B,
      distanceMeters: KM20,
      details: { movingVolume: 'medium', movers: true, moverCount: 2, lift: false, floor: 5 },
    });
    const labels = moving.lines.map((line) => line.label).join(' ');
    expect(labels).toContain('Базова послуга');
    expect(labels).toContain('2 вантажники');
    expect(labels).toContain('5 поверх');
    expect(labels).toContain('Без ліфта');
    expect(labels).toContain('Разом');
  });
});

describe('MockPricingProvider', () => {
  it('quotes from the in-memory catalog without a database', async () => {
    const provider = new MockPricingProvider();
    const priced = await provider.quote({
      serviceKey: 'roadside',
      pickupLabel: KYIV.label,
      pickup: KYIV,
      distanceMeters: 0,
      details: { roadsideProblem: 'fuel' },
      at: WEEKDAY,
    });
    expect(provider.mock).toBe(true);
    expect(priced.breakdown.totalKopiyky).toBe(80_000);
    expect(priced.breakdown.lines.some((line) => line.code === 'fuel')).toBe(true);
  });
});

describe('calculateAmountKopiyky compatibility', () => {
  const rule = {
    baseFeeKopiyky: 50_000,
    perKmKopiyky: 2_500,
    minFeeKopiyky: 50_000,
  };

  it('uses base/min fee for pickup-only (0 km)', () => {
    expect(calculateAmountKopiyky(0, rule, WEEKDAY)).toBe(50_000);
  });

  it('adds ceil(km * per_km) to the base fee', () => {
    expect(calculateAmountKopiyky(1_500, rule, WEEKDAY)).toBe(53_750);
  });
});
