import { market } from '../config/market';

const UA_PHONE = /^\+380\d{9}$/;

export function normalizeUaPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let normalized = digits;

  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  } else if (normalized.startsWith('380')) {
    normalized = `+${normalized}`;
  } else if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = `${market.phonePrefix}${normalized.slice(1)}`;
  }

  if (!UA_PHONE.test(normalized)) {
    return null;
  }

  return normalized;
}
