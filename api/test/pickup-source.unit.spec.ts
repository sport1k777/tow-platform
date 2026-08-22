import { parsePickupSource } from '../src/geo/pickup-source';

describe('parsePickupSource', () => {
  it('accepts known pickup sources', () => {
    expect(parsePickupSource('manual_address')).toBe('manual_address');
    expect(parsePickupSource('current_location')).toBe('current_location');
    expect(parsePickupSource('map_pin')).toBe('map_pin');
  });

  it('falls back to manual_address', () => {
    expect(parsePickupSource(undefined)).toBe('manual_address');
    expect(parsePickupSource('gps')).toBe('manual_address');
  });
});
