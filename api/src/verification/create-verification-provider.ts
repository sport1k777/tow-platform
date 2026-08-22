import { isMockVerificationEnabled, loadEnv } from '../config/env';
import type { DocumentVerificationProvider } from './document-verification.provider';
import { ManualReviewProvider } from './manual-review.provider';
import { MockDocumentVerificationProvider } from './mock-verification.provider';

export function createDocumentVerificationProvider(): DocumentVerificationProvider {
  const env = loadEnv();
  if (env.VERIFICATION_PROVIDER !== 'none' && env.VERIFICATION_PROVIDER !== 'manual') {
    throw new Error('External verification provider is not configured.');
  }
  if (isMockVerificationEnabled(env)) {
    return new MockDocumentVerificationProvider();
  }
  return new ManualReviewProvider();
}
