import { apiRequest, apiUpload } from './client';

export type DocumentType =
  | 'drivers_license'
  | 'identity'
  | 'vehicle_registration'
  | 'insurance';

export type DocumentStatus =
  | 'not_submitted'
  | 'uploaded'
  | 'processing'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export type DriverDocument = {
  id: string | null;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: string | null;
  processedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  verificationMethod: string;
  mimeType?: string | null;
  extractedData?: Record<string, unknown>;
};

export type DriverVerification = {
  driverUserId: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  hasAvatar: boolean;
  verificationStatus: string;
  verificationMode: 'manual' | 'mock';
  mockMode: boolean;
  providerId: string;
  providerConfigured: boolean;
  providerMessage: string | null;
  requiredCount: number;
  approvedCount: number;
  documents: DriverDocument[];
  eligibility: {
    canGoOnline: boolean;
    blockers: string[];
  };
  vehicles: {
    id: string;
    vehicleCategory: string;
    make: string | null;
    model: string | null;
    year: number | null;
    plateNumber: string | null;
    services: string[];
    active: boolean;
    approved: boolean;
  }[];
  events?: {
    id: string;
    action: string;
    reason: string | null;
    createdAt: string;
  }[];
};

export function fetchDriverVerification(accessToken: string) {
  return apiRequest<DriverVerification>('/drivers/me/verification', { accessToken });
}

export function uploadDriverDocument(
  type: DocumentType,
  file: { uri: string; name: string; type: string },
  accessToken: string,
  onProgress?: (percent: number) => void,
) {
  return apiUpload<DriverVerification>(
    '/drivers/me/documents',
    file,
    accessToken,
    { type },
    onProgress,
  );
}

export function replaceDriverDocument(
  documentId: string,
  file: { uri: string; name: string; type: string },
  accessToken: string,
  onProgress?: (percent: number) => void,
) {
  return apiUpload<DriverVerification>(
    `/drivers/me/documents/${documentId}/replace`,
    file,
    accessToken,
    {},
    onProgress,
  );
}

export function fetchAdminDriverVerification(driverId: string, accessToken: string) {
  return apiRequest<DriverVerification>(`/admin/drivers/${driverId}/verification`, {
    accessToken,
  });
}

export function approveAdminDocument(documentId: string, accessToken: string) {
  return apiRequest<DriverVerification>(`/admin/documents/${documentId}/approve`, {
    method: 'POST',
    accessToken,
    body: {},
  });
}

export function rejectAdminDocument(documentId: string, reason: string, accessToken: string) {
  return apiRequest<DriverVerification>(`/admin/documents/${documentId}/reject`, {
    method: 'POST',
    accessToken,
    body: { reason },
  });
}

export function requestAdminReupload(documentId: string, reason: string, accessToken: string) {
  return apiRequest<DriverVerification>(`/admin/documents/${documentId}/reupload`, {
    method: 'POST',
    accessToken,
    body: { reason },
  });
}
