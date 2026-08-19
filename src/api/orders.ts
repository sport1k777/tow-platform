import type { ServiceKey, VehicleCategory } from '@/config/services';

import { apiRequest } from './client';
import type { GeoPlace } from './geo';

export type OrderStatus =
  | 'searching'
  | 'offered'
  | 'accepted'
  | 'driver_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type OrderHistoryItem = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
};

export type OrderResponse = {
  id: string;
  quoteId: string;
  status: OrderStatus;
  serviceKey: ServiceKey;
  vehicleCategory: VehicleCategory | null;
  details: Record<string, unknown>;
  pickup: GeoPlace;
  destination: GeoPlace | null;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: string;
  driverId: string | null;
  driver?: {
    displayName: string | null;
    phone: string | null;
    vehicleCategory: string | null;
    plateNumber: string | null;
  } | null;
  searchExpiresAt: string;
  cancelledBy: 'customer' | 'driver' | null;
  createdAt: string;
  history?: OrderHistoryItem[];
};

export function createOrder(quoteId: string, accessToken: string) {
  return apiRequest<OrderResponse>('/orders', {
    method: 'POST',
    accessToken,
    body: { quoteId },
  });
}

export function fetchOrders(accessToken: string) {
  return apiRequest<{ items: OrderResponse[] }>('/orders', { accessToken });
}

export function fetchOrder(orderId: string, accessToken: string) {
  return apiRequest<OrderResponse>(`/orders/${orderId}`, { accessToken });
}

export function cancelOrder(orderId: string, accessToken: string) {
  return apiRequest<OrderResponse>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    accessToken,
  });
}
