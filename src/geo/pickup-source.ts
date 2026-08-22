export const pickupSources = [
  'manual_address',
  'current_location',
  'map_pin',
] as const;

export type PickupSource = (typeof pickupSources)[number];

export function isPickupSource(value: unknown): value is PickupSource {
  return pickupSources.includes(value as PickupSource);
}

export function parsePickupSource(value: unknown): PickupSource {
  return isPickupSource(value) ? value : 'manual_address';
}
