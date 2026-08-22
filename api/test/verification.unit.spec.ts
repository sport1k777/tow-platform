import { detectMimeType } from '../src/files/file-type';
import { ManualReviewProvider } from '../src/verification/manual-review.provider';
import { MockDocumentVerificationProvider } from '../src/verification/mock-verification.provider';
import { loadEnv } from '../src/config/env';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('file-type', () => {
  it('detects png magic bytes and rejects empty buffers', () => {
    expect(detectMimeType(PNG_1X1)).toBe('image/png');
    expect(detectMimeType(Buffer.from('not-a-file'))).toBeNull();
  });
});

describe('document verification providers', () => {
  it('never auto-approves in the manual review provider', async () => {
    const result = await new ManualReviewProvider().verify({
      type: 'drivers_license',
      mimeType: 'image/png',
      byteSize: 12,
    });
    expect(result.configured).toBe(false);
    expect(result.authenticity.result).toBe('unknown');
    expect(result.extraction.extracted).toBe(false);
  });

  it('never auto-approves in mock mode either', async () => {
    const result = await new MockDocumentVerificationProvider().verify({
      type: 'identity',
      mimeType: 'image/jpeg',
      byteSize: 12,
    });
    expect(result.providerId).toBe('mock');
    expect(result.authenticity.result).toBe('unknown');
    expect(result.authenticity.notes).toMatch(/DEV \/ TEST MODE/);
  });
});

describe('VERIFICATION_MODE', () => {
  it('defaults to manual review', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://tow:tow@localhost:5433/tow_platform',
      JWT_SECRET: 'change-me-in-development-min-32-chars',
    });
    expect(env.VERIFICATION_MODE).toBe('manual');
    expect(env.VERIFICATION_PROVIDER).toBe('none');
  });

  it('rejects VERIFICATION_MODE=mock in production', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        AUTH_OTP_MODE: 'sms',
        SMS_PROVIDER: 'dev',
        DATABASE_URL: 'postgresql://tow:tow@localhost:5433/tow_platform',
        JWT_SECRET: 'change-me-in-development-min-32-chars',
        VERIFICATION_MODE: 'mock',
      }),
    ).toThrow(/VERIFICATION_MODE=mock/);
  });
});
