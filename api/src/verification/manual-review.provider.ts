import type {
  DocumentVerificationProvider,
  VerifyDocumentInput,
  VerifyDocumentResult,
} from './document-verification.provider';

/**
 * Production default. No external registry/OCR/authenticity API is configured.
 * Extraction stays empty; authenticity stays unknown. Callers must never auto-approve.
 */
export class ManualReviewProvider implements DocumentVerificationProvider {
  readonly id = 'manual-review';
  readonly configured = false;

  async verify(_input: VerifyDocumentInput): Promise<VerifyDocumentResult> {
    return {
      providerId: this.id,
      configured: false,
      extraction: { extracted: false },
      authenticity: {
        result: 'unknown',
        notes: 'External verification provider is not configured.',
      },
    };
  }
}
