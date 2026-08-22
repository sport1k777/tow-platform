import { API_URL, apiRequest, apiUpload } from './client';

export type UserProfile = {
  id: string;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  hasAvatar: boolean;
  roles: string[];
};

export function fetchProfile(accessToken: string) {
  return apiRequest<UserProfile>('/users/me', { accessToken });
}

export function updateProfile(
  body: { displayName?: string; firstName?: string; lastName?: string },
  accessToken: string,
) {
  return apiRequest<UserProfile>('/users/me', {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export function updateDisplayName(displayName: string, accessToken: string) {
  return updateProfile({ displayName }, accessToken);
}

export function uploadAvatar(
  file: { uri: string; name: string; type: string },
  accessToken: string,
  onProgress?: (percent: number) => void,
) {
  return apiUpload<UserProfile>('/users/me/avatar', file, accessToken, {}, onProgress);
}

export function deleteAvatar(accessToken: string) {
  return apiRequest<UserProfile>('/users/me/avatar', {
    method: 'DELETE',
    accessToken,
  });
}

export function ownAvatarUri(hasAvatar: boolean, bust?: string | number) {
  if (!hasAvatar) {
    return null;
  }
  return `${API_URL}/users/me/avatar?t=${bust ?? '1'}`;
}

export function adminAvatarUri(driverId: string, hasAvatar: boolean, bust?: string | number) {
  if (!hasAvatar) {
    return null;
  }
  return `${API_URL}/admin/drivers/${driverId}/avatar?t=${bust ?? '1'}`;
}

export function ownDocumentFileUri(documentId: string) {
  return `${API_URL}/drivers/me/documents/${documentId}/file`;
}

export function adminDocumentFileUri(driverId: string, documentId: string) {
  return `${API_URL}/admin/drivers/${driverId}/documents/${documentId}/file`;
}
