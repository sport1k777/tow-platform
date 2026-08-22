import type { DocumentType } from '../config/market';

export type DocumentAuthenticity = 'unknown' | 'pass' | 'fail';

export type DocumentExtraction = {
  extracted: boolean;
  documentNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  expiresAt?: string;
  qualityNotes?: string[];
};

export type VerifyDocumentInput = {
  type: DocumentType;
  mimeType: string;
  byteSize: number;
};

export type VerifyDocumentResult = {
  providerId: string;
  configured: boolean;
  /** Extraction is not authenticity. Never treat this as proof the document is genuine. */
  extraction: DocumentExtraction;
  authenticity: {
    result: DocumentAuthenticity;
    notes: string;
  };
};

export const DOCUMENT_VERIFICATION_PROVIDER = Symbol('DOCUMENT_VERIFICATION_PROVIDER');

export interface DocumentVerificationProvider {
  readonly id: string;
  readonly configured: boolean;
  verify(input: VerifyDocumentInput): Promise<VerifyDocumentResult>;
}
