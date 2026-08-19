export type ScoredDriver = {
  userId: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  lastSeenAt: Date | null;
};

export function compareScoredDrivers(a: ScoredDriver, b: ScoredDriver): number {
  const aRouted = a.durationSeconds != null && a.distanceMeters != null;
  const bRouted = b.durationSeconds != null && b.distanceMeters != null;
  if (aRouted && bRouted) {
    if (a.durationSeconds !== b.durationSeconds) {
      return (a.durationSeconds as number) - (b.durationSeconds as number);
    }
    if (a.distanceMeters !== b.distanceMeters) {
      return (a.distanceMeters as number) - (b.distanceMeters as number);
    }
    return a.userId.localeCompare(b.userId);
  }
  if (aRouted) {
    return -1;
  }
  if (bRouted) {
    return 1;
  }
  const aSeen = a.lastSeenAt?.getTime() ?? 0;
  const bSeen = b.lastSeenAt?.getTime() ?? 0;
  if (aSeen !== bSeen) {
    return bSeen - aSeen;
  }
  return a.userId.localeCompare(b.userId);
}
