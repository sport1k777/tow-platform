import { copy } from '@/copy/uk';

function looksTechnical(message: string) {
  const lower = message.toLowerCase();
  return /exception|fetch failed|network request|status code|econnrefused|timeout|undefined|expo|promise\.swift|could not connect/.test(
    lower,
  );
}

export function userFacingError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : '';
  const lower = message.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('could not connect') ||
    lower.includes('failed to connect') ||
    lower.includes('unexpectedexception') ||
    lower.includes('internet')
  ) {
    return copy.connectionError;
  }
  if (message.trim() && !looksTechnical(message)) {
    return message;
  }
  return copy.requestError;
}
