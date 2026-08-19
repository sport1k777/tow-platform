import { apiRequest } from './client';

export function fetchProfile(accessToken: string) {
  return apiRequest<{
    id: string;
    phone: string | null;
    displayName: string | null;
    roles: string[];
  }>('/users/me', { accessToken });
}

export function updateDisplayName(displayName: string, accessToken: string) {
  return apiRequest<{ id: string; phone: string | null; displayName: string | null }>(
    '/users/me',
    { method: 'PATCH', accessToken, body: { displayName } },
  );
}
