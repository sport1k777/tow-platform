export function formatUah(kopiyky: number): string {
  const value = kopiyky / 100;
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `₴ ${formatted}`;
}

export function formatDistanceKm(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(1)} км`;
}

export function formatEta(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} хв`;
}

export function formatRouteSummary(distanceMeters: number, durationSeconds: number): string {
  const km = (distanceMeters / 1000).toFixed(1);
  return `${km} км · ${formatEta(durationSeconds)}`;
}
