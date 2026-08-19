import { compareScoredDrivers, type ScoredDriver } from '../src/matching/matching.score';

describe('compareScoredDrivers', () => {
  const routed = (
    userId: string,
    durationSeconds: number,
    distanceMeters: number,
  ): ScoredDriver => ({
    userId,
    durationSeconds,
    distanceMeters,
    lastSeenAt: null,
  });

  it('prefers the shorter route duration, then distance, then user id', () => {
    const drivers = [
      routed('b', 120, 1000),
      routed('a', 120, 800),
      routed('c', 90, 2000),
    ];
    drivers.sort(compareScoredDrivers);
    expect(drivers.map((driver) => driver.userId)).toEqual(['c', 'a', 'b']);
  });

  it('ranks routed drivers ahead of last-seen fallback', () => {
    const older: ScoredDriver = {
      userId: 'fallback',
      durationSeconds: null,
      distanceMeters: null,
      lastSeenAt: new Date('2026-08-15T10:00:00Z'),
    };
    const near = routed('near', 30, 100);
    expect(compareScoredDrivers(near, older)).toBeLessThan(0);
    expect(compareScoredDrivers(older, near)).toBeGreaterThan(0);
  });

  it('uses lastSeenAt then user id when neither driver has a route', () => {
    const newer: ScoredDriver = {
      userId: 'z',
      durationSeconds: null,
      distanceMeters: null,
      lastSeenAt: new Date('2026-08-15T12:00:00Z'),
    };
    const older: ScoredDriver = {
      userId: 'a',
      durationSeconds: null,
      distanceMeters: null,
      lastSeenAt: new Date('2026-08-15T11:00:00Z'),
    };
    expect(compareScoredDrivers(newer, older)).toBeLessThan(0);
  });
});
