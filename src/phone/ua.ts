const PREFIX = '+380';
const LOCAL_LENGTH = 9;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function localDigitsFromInput(value: string): string {
  let digits = digitsOnly(value);
  if (digits.startsWith('380')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, LOCAL_LENGTH);
}

export function formatLocalUa(local: string): string {
  const d = localDigitsFromInput(local);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

export function toE164(local: string): string {
  return `${PREFIX}${localDigitsFromInput(local)}`;
}

export function isCompleteUaMobile(local: string): boolean {
  return localDigitsFromInput(local).length === LOCAL_LENGTH;
}

export const uaPhonePrefix = PREFIX;
