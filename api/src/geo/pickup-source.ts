export const pickupSources = [
  'manual_address',
  'current_location',
  'map_pin',
] as const;

export type PickupSource = (typeof pickupSources)[number];

export function parsePickupSource(value: unknown): PickupSource {
  return pickupSources.includes(value as PickupSource)
    ? (value as PickupSource)
    : 'manual_address';
}
