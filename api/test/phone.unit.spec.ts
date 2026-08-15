import { normalizeUaPhone } from '../src/auth/phone';

describe('normalizeUaPhone', () => {
  it('accepts +380 numbers', () => {
    expect(normalizeUaPhone('+380501234567')).toBe('+380501234567');
  });

  it('normalizes local 0XXXXXXXXX numbers', () => {
    expect(normalizeUaPhone('0501234567')).toBe('+380501234567');
  });

  it('rejects non-Ukrainian numbers', () => {
    expect(normalizeUaPhone('+48123456789')).toBeNull();
    expect(normalizeUaPhone('+1-202-555-0100')).toBeNull();
  });
});
