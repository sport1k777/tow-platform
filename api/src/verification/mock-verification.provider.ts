import type {
  DocumentVerificationProvider,
  VerifyDocumentInput,
  VerifyDocumentResult,
} from './document-verification.provider';

/**
 * Development-only adapter. Still does not prove authenticity and must never auto-approve.
 * Clearly labeled via VERIFICATION_MODE=mock so it cannot be confused with production KYC.
 */
export class MockDocumentVerificationProvider implements DocumentVerificationProvider {
  readonly id = 'mock';
  readonly configured = false;

  async verify(_input: VerifyDocumentInput): Promise<VerifyDocumentResult> {
    return {
      providerId: this.id,
      configured: false,
      extraction: {
        extracted: false,
        qualityNotes: ['DEV / TEST MODE: extraction is not a real OCR result.'],
      },
      authenticity: {
        result: 'unknown',
        notes: 'DEV / TEST MODE. External verification provider is not configured. Documents are never auto-approved.',
      },
    };
  }
}
