import { cityNameUk, detectCityCode } from './cities';
import { lookupFromQuoteInput } from './lookup';
import type {
  PriceLine,
  PricingQuoteInput,
  PricingTariff,
  QuoteBreakdown,
} from './types';

const LABELS = {
  dispatch: 'Подача',
  distance: 'Відстань',
  base: 'Базова послуга',
  total: 'Разом',
  min: 'Мінімальна вартість',
  noElevator: 'Без ліфта',
  withElevator: 'Ліфт',
  fuel: 'Пальне',
  blockedWheels: 'Заблоковані колеса',
  missingWheels: 'Відсутні колеса',
  accident: 'ДТП / складне завантаження',
  equipment: 'Додаткове обладнання',
  waiting: 'Очікування',
  hourly: 'Погодинна робота',
  movers: (count: number) => `${count} вантажники`,
  floor: (floor: number) => `${floor} поверх`,
} as const;

const TOW_VEHICLE_LABELS: Record<string, string> = {
  car: 'Легкове авто',
  suv: 'Позашляховик / SUV',
  van: 'Мікроавтобус',
  truck: 'Вантажний автомобіль',
  motorcycle: 'Мото',
};

const ROADSIDE_LABELS: Record<string, string> = {
  battery: 'Запуск двигуна',
  fuel: 'Доставка пального',
  tire: 'Заміна колеса',
  keys: 'Відкриття автомобіля',
  winch: 'Витягування автомобіля',
  other: 'Інша допомога',
};

const MOVING_VOLUME_LABELS: Record<string, string> = {
  boxes: 'Кілька коробок',
  small: 'До 1 м³',
  medium: '1–5 м³',
  large: 'Більше 5 м³',
};

const CARGO_CLASS_LABELS: Record<string, string> = {
  van: 'Малий фургон',
  t15: 'До 1,5 т',
  t35: 'До 3,5 т',
  t5: '5 т',
  truck: 'Велика вантажівка',
};

export function calculateServiceQuote(
  input: PricingQuoteInput,
  tariff: PricingTariff,
): QuoteBreakdown {
  if (tariff.serviceKey !== input.serviceKey) {
    throw new Error('Pricing tariff service does not match the requested service');
  }

  switch (input.serviceKey) {
    case 'tow':
      return finalize(input, tariff, quoteTow(input, tariff));
    case 'roadside':
      return finalize(input, tariff, quoteRoadside(input, tariff));
    case 'moving':
      return finalize(input, tariff, quoteMoving(input, tariff));
    case 'cargo':
      return finalize(input, tariff, quoteCargo(input, tariff));
  }
}

function quoteTow(input: PricingQuoteInput, tariff: PricingTariff): PriceLine[] {
  const vehicle =
    stringField(input.details?.towVehicle) ??
    input.vehicleCategory ??
    tariff.vehicleCategory;
  const vehicleLabel = TOW_VEHICLE_LABELS[vehicle ?? ''] ?? 'Авто';
  const lines: PriceLine[] = [
    line('base', `${LABELS.dispatch} · ${vehicleLabel}`, tariff.baseFeeKopiyky),
  ];
  pushDistance(lines, input, tariff);
  pushIf(lines, boolField(input.details?.blockedWheels), 'blocked_wheels', LABELS.blockedWheels, tariff.config.blockedWheelsFeeKopiyky);
  pushIf(lines, boolField(input.details?.missingWheels), 'missing_wheels', LABELS.missingWheels, tariff.config.missingWheelsFeeKopiyky);
  pushIf(lines, boolField(input.details?.accident) || boolField(input.details?.difficultLoading), 'accident', LABELS.accident, tariff.config.accidentFeeKopiyky);
  pushIf(lines, boolField(input.details?.extraEquipment), 'equipment', LABELS.equipment, tariff.config.equipmentFeeKopiyky);
  pushWaiting(lines, input, tariff);
  return lines;
}

function quoteRoadside(input: PricingQuoteInput, tariff: PricingTariff): PriceLine[] {
  const option = stringField(input.details?.roadsideProblem) ?? tariff.optionKey ?? 'other';
  const label = ROADSIDE_LABELS[option] ?? LABELS.base;
  const lines: PriceLine[] = [line('base', label, tariff.baseFeeKopiyky)];
  if (option === 'fuel') {
    lines.push(line('fuel', LABELS.fuel, tariff.config.fuelSurchargeKopiyky));
  }
  pushDistance(lines, input, tariff);
  pushWaiting(lines, input, tariff);
  return lines;
}

function quoteMoving(input: PricingQuoteInput, tariff: PricingTariff): PriceLine[] {
  const volume = stringField(input.details?.movingVolume) ?? tariff.optionKey ?? 'medium';
  const volumeLabel = MOVING_VOLUME_LABELS[volume] ?? LABELS.base;
  const lines: PriceLine[] = [
    line('base', `${LABELS.base} · ${volumeLabel}`, tariff.baseFeeKopiyky),
  ];

  const moverCount = moverCountFromDetails(input.details);
  if (moverCount > 0) {
    lines.push(
      line(
        'labor',
        LABELS.movers(moverCount),
        moverCount * tariff.config.moverFeeKopiyky,
      ),
    );
  }

  const floor = floorFromDetails(input.details);
  const hasLift = boolField(input.details?.lift);
  if (floor > 0) {
    const floorCharge = hasLift ? 0 : floor * tariff.config.floorFeeKopiyky;
    if (floorCharge > 0) {
      lines.push(line('floor', LABELS.floor(floor), floorCharge));
    }
  }
  if (hasLift === false) {
    lines.push(line('elevator', LABELS.noElevator, tariff.config.noElevatorFeeKopiyky));
  }

  pushDistance(lines, input, tariff);
  pushWaiting(lines, input, tariff);
  return lines;
}

function quoteCargo(input: PricingQuoteInput, tariff: PricingTariff): PriceLine[] {
  const cargoClass = stringField(input.details?.cargoClass) ?? tariff.optionKey ?? 'van';
  const classLabel = CARGO_CLASS_LABELS[cargoClass] ?? LABELS.base;
  const lines: PriceLine[] = [
    line('base', `${LABELS.base} · ${classLabel}`, tariff.baseFeeKopiyky),
  ];
  pushDistance(lines, input, tariff);

  const hours = numberField(input.details?.hours);
  if (hours && hours > 0) {
    lines.push(line('hourly', LABELS.hourly, hours * tariff.config.hourlyFeeKopiyky));
  }

  const moverCount = moverCountFromDetails(input.details);
  if (moverCount > 0) {
    lines.push(
      line('labor', LABELS.movers(moverCount), moverCount * tariff.config.moverFeeKopiyky),
    );
  }
  if (boolField(input.details?.loading)) {
    lines.push(line('loading', 'Завантаження / розвантаження', tariff.config.moverFeeKopiyky));
  }
  pushWaiting(lines, input, tariff);
  return lines;
}

function finalize(
  input: PricingQuoteInput,
  tariff: PricingTariff,
  lines: PriceLine[],
): QuoteBreakdown {
  const cityCode = lookupFromQuoteInput(input).cityCode;
  const positive = lines.filter((item) => item.amountKopiyky !== 0);
  let subtotal = positive.reduce((sum, item) => sum + item.amountKopiyky, 0);
  if (subtotal < tariff.minFeeKopiyky) {
    positive.push(line('minimum', LABELS.min, tariff.minFeeKopiyky - subtotal));
    subtotal = tariff.minFeeKopiyky;
  }
  const total = applyTimeMultipliers(
    subtotal,
    tariff.nightMultiplierBps,
    tariff.weekendMultiplierBps,
    input.at ?? new Date(),
    input.timeZone ?? 'Europe/Kyiv',
  );
  if (total !== subtotal) {
    positive.push(line('time', 'Нічний / вихідний тариф', total - subtotal));
  }
  return {
    serviceKey: input.serviceKey,
    cityCode,
    lines: [
      ...positive,
      line('total', `${LABELS.total} · ${cityNameUk(cityCode)}`, total),
    ],
    totalKopiyky: total,
  };
}

function pushDistance(
  lines: PriceLine[],
  input: PricingQuoteInput,
  tariff: PricingTariff,
): void {
  if (input.distanceMeters <= 0) {
    return;
  }
  const km = input.distanceMeters / 1000;
  const pickupCity = detectCityCode(input.pickupLabel, input.pickup);
  const destinationCity = input.destination
    ? detectCityCode(input.destinationLabel, input.destination)
    : pickupCity;
  const outsideCity =
    Boolean(pickupCity && destinationCity && pickupCity !== destinationCity) ||
    boolField(input.details?.outsideCity);
  const perKm =
    outsideCity && tariff.config.outsideCityPerKmKopiyky > 0
      ? tariff.config.outsideCityPerKmKopiyky
      : tariff.perKmKopiyky;
  if (perKm <= 0) {
    return;
  }
  const amount = Math.ceil(km * perKm);
  const kmLabel = Number.isInteger(km) ? String(km) : km.toFixed(1);
  const uahPerKm = Math.round(perKm) / 100;
  lines.push(
    line(
      'distance',
      `${LABELS.distance} — ${kmLabel} км × ${formatUahNumber(uahPerKm)} грн`,
      amount,
    ),
  );
}

function pushWaiting(
  lines: PriceLine[],
  input: PricingQuoteInput,
  tariff: PricingTariff,
): void {
  const minutes = numberField(input.details?.waitingMinutes);
  if (!minutes || minutes <= 0 || tariff.config.waitingFeeKopiyky <= 0) {
    return;
  }
  lines.push(line('waiting', LABELS.waiting, minutes * tariff.config.waitingFeeKopiyky));
}

function pushIf(
  lines: PriceLine[],
  enabled: boolean | null,
  code: string,
  label: string,
  amount: number,
): void {
  if (enabled && amount > 0) {
    lines.push(line(code, label, amount));
  }
}

function applyTimeMultipliers(
  amount: number,
  nightMultiplierBps: number,
  weekendMultiplierBps: number,
  at: Date,
  timeZone: string,
): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '12');
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const night = hour >= 22 || hour < 6;
  const weekend = weekday === 'Sat' || weekday === 'Sun';
  let next = amount;
  if (night && nightMultiplierBps !== 10_000) {
    next = Math.ceil((next * nightMultiplierBps) / 10_000);
  }
  if (weekend && weekendMultiplierBps !== 10_000) {
    next = Math.ceil((next * weekendMultiplierBps) / 10_000);
  }
  return next;
}

function moverCountFromDetails(details?: Record<string, unknown>): number {
  if (!details) {
    return 0;
  }
  const explicit = numberField(details.moverCount);
  if (explicit && explicit > 0) {
    return explicit;
  }
  if (boolField(details.movers) === true) {
    return 2;
  }
  return 0;
}

function floorFromDetails(details?: Record<string, unknown>): number {
  if (!details) {
    return 0;
  }
  const value = details.floor;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function line(code: string, label: string, amountKopiyky: number): PriceLine {
  return { code, label, amountKopiyky };
}

function formatUahNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function boolField(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'yes') {
    return true;
  }
  if (value === 'no') {
    return false;
  }
  return null;
}

function numberField(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

/** @deprecated Use calculateServiceQuote. Kept for existing call sites during migration. */
export function calculateAmountKopiyky(
  distanceMeters: number,
  rule: {
    baseFeeKopiyky: number;
    perKmKopiyky: number;
    minFeeKopiyky: number;
    nightMultiplierBps?: number;
    weekendMultiplierBps?: number;
  },
  at: Date = new Date(),
  timeZone = 'Europe/Kyiv',
): number {
  const km = distanceMeters / 1000;
  const variable = Math.ceil(km * rule.perKmKopiyky);
  const base = Math.max(rule.minFeeKopiyky, rule.baseFeeKopiyky + variable);
  return applyTimeMultipliers(
    base,
    rule.nightMultiplierBps ?? 10_000,
    rule.weekendMultiplierBps ?? 10_000,
    at,
    timeZone,
  );
}
