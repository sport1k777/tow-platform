import { apiRequest } from './client';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type MeResponse = {
  id: string;
  phone: string | null;
  displayName?: string | null;
  roles: ('customer' | 'driver' | 'admin')[];
  canUseDriverMode: boolean;
  canUseAdminMode?: boolean;
};

export function requestOtp(phone: string) {
  return apiRequest<{
    sent: true;
    expiresIn: number;
    otpMode?: 'mock';
    devCode?: string;
  }>('/auth/otp/request', { method: 'POST', body: { phone } });
}

export function verifyOtp(
  phone: string,
  code: string,
  role: 'customer' | 'driver' = 'customer',
) {
  return apiRequest<TokenPair>('/auth/otp/verify', {
    method: 'POST',
    body: { phone, code, role },
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function logoutRequest(accessToken: string, refreshToken: string) {
  return apiRequest<{ ok: true }>('/auth/logout', {
    method: 'POST',
    accessToken,
    body: { refreshToken },
  });
}

export function fetchMe(accessToken: string) {
  return apiRequest<MeResponse>('/me', { accessToken });
}
