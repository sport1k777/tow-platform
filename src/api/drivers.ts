import { apiRequest } from './client';
import type { OrderResponse } from './orders';

export type DriverMe = {
  userId: string;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  hasAvatar: boolean;
  verificationStatus: string;
  isOnline: boolean;
  availability: 'offline' | 'online' | 'busy' | 'suspended';
  completedOrdersCount: number;
  rating: number | null;
  canGoOnline: boolean;
  blockers: string[];
  verificationMode?: 'manual' | 'mock';
  mockMode?: boolean;
  providerConfigured?: boolean;
  vehicles: {
    id: string;
    vehicleCategory: string;
    make: string | null;
    model: string | null;
    year: number | null;
    plateNumber: string | null;
    capacityKg: number | null;
    services: string[];
    active: boolean;
    approved: boolean;
  }[];
};

export type DriverOffer = {
  id: string;
  orderId: string;
  status: 'pending';
  expiresAt: string;
  order: {
    serviceKey: string;
    pickup: { lat: number; lng: number; label: string };
    destination: { lat: number; lng: number; label: string } | null;
    distanceMeters: number;
    durationSeconds: number;
    amountKopiyky: number;
    currency: string;
  };
};

export function fetchDriverMe(accessToken: string) {
  return apiRequest<DriverMe>('/drivers/me', { accessToken });
}

export function setDriverPresence(
  body: { online?: boolean; lat?: number; lng?: number },
  accessToken: string,
) {
  return apiRequest<DriverMe>('/drivers/me/presence', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function fetchCurrentOffer(accessToken: string) {
  return apiRequest<{ offer: DriverOffer | null }>('/driver/offers/current', {
    accessToken,
  });
}

export function acceptOffer(offerId: string, accessToken: string) {
  return apiRequest<OrderResponse>(`/driver/offers/${offerId}/accept`, {
    method: 'POST',
    accessToken,
  });
}

export function rejectOffer(offerId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/driver/offers/${offerId}/reject`, {
    method: 'POST',
    accessToken,
  });
}

export function fetchDriverOrders(accessToken: string) {
  return apiRequest<{ items: OrderResponse[] }>('/orders/driver/active', {
    accessToken,
  });
}

export function progressOrder(
  orderId: string,
  action: 'en-route' | 'arrive' | 'start' | 'complete',
  accessToken: string,
) {
  return apiRequest<OrderResponse>(`/orders/${orderId}/${action}`, {
    method: 'POST',
    accessToken,
  });
}
