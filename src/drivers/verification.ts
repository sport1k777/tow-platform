import { copy } from '@/copy/uk';
import type { DocumentStatus, DocumentType } from '@/api/verification';
import type { IconName } from '@/ui';

export function verificationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'incomplete':
      return copy.verificationIncomplete;
    case 'pending_verification':
      return copy.verificationPending;
    case 'under_review':
      return copy.verificationReview;
    case 'approved':
      return copy.verificationApproved;
    case 'rejected':
      return copy.verificationRejected;
    case 'suspended':
      return copy.verificationSuspended;
    case 'expired':
      return copy.verificationExpired;
    default:
      return status ?? '';
  }
}

export function verificationStatusHint(status: string | null | undefined): string {
  switch (status) {
    case 'incomplete':
      return copy.documentsIncompleteHint;
    case 'pending_verification':
      return copy.documentsPendingHint;
    case 'under_review':
      return copy.documentsReviewHint;
    case 'approved':
      return copy.driverApprovedLabel;
    case 'rejected':
      return copy.documentsRejectedHint;
    case 'suspended':
      return copy.verificationSuspended;
    case 'expired':
      return copy.documentsExpiredHint;
    default:
      return copy.verificationPending;
  }
}

export function isApprovedDriver(status: string | null | undefined): boolean {
  return status === 'approved';
}

export function documentTypeLabel(type: DocumentType): string {
  switch (type) {
    case 'drivers_license':
      return copy.licenseDoc;
    case 'identity':
      return copy.identityDoc;
    case 'vehicle_registration':
      return copy.vehicleRegDoc;
    case 'insurance':
      return copy.insuranceDoc;
    default:
      return type;
  }
}

export function documentTypeIcon(type: DocumentType): IconName {
  switch (type) {
    case 'drivers_license':
      return 'license';
    case 'identity':
      return 'identity';
    case 'vehicle_registration':
      return 'vehicle';
    case 'insurance':
      return 'insurance';
    default:
      return 'documents';
  }
}

export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case 'not_submitted':
      return copy.documentNotUploaded;
    case 'uploaded':
      return copy.documentUploaded;
    case 'processing':
      return copy.documentProcessing;
    case 'needs_review':
      return copy.documentNeedsReview;
    case 'approved':
      return copy.documentApproved;
    case 'rejected':
      return copy.documentRejected;
    case 'expired':
      return copy.documentExpired;
    default:
      return status;
  }
}

export function formatUaDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('uk-UA');
}
