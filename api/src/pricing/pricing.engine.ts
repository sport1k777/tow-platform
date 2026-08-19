export type PricingRuleInput = {
  baseFeeKopiyky: number;
  perKmKopiyky: number;
  minFeeKopiyky: number;
  nightMultiplierBps?: number;
  weekendMultiplierBps?: number;
};

export function calculateAmountKopiyky(
  distanceMeters: number,
  rule: PricingRuleInput,
  at: Date = new Date(),
  timeZone = 'Europe/Kyiv',
): number {
  const km = distanceMeters / 1000;
  const variable = Math.ceil(km * rule.perKmKopiyky);
  const base = Math.max(rule.minFeeKopiyky, rule.baseFeeKopiyky + variable);
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
  const nightBps = rule.nightMultiplierBps ?? 10_000;
  const weekendBps = rule.weekendMultiplierBps ?? 10_000;
  let amount = base;
  if (night) {
    amount = Math.ceil((amount * nightBps) / 10000);
  }
  if (weekend) {
    amount = Math.ceil((amount * weekendBps) / 10000);
  }
  return amount;
}
