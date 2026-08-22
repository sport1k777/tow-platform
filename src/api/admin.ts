import { apiRequest } from './client';

export function fetchAdminStats(accessToken: string) {
  return apiRequest<{
    users: number;
    drivers: number;
    orders: number;
    ordersByStatus: Record<string, number>;
  }>('/admin/stats', { accessToken });
}

export function fetchAdminOrders(accessToken: string) {
  return apiRequest<{
    items: {
      id: string;
      status: string;
      serviceKey: string;
      amountKopiyky: number;
      currency: string;
      pickupLabel: string;
      createdAt: string;
    }[];
  }>('/admin/orders', { accessToken });
}

export function fetchAdminDrivers(accessToken: string) {
  return apiRequest<{
    items: {
      userId: string;
      phone: string | null;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      hasAvatar: boolean;
      verificationStatus: string;
      isOnline: boolean;
      completedOrdersCount: number;
    }[];
  }>('/admin/drivers', { accessToken });
}

export function setAdminDriverStatus(
  userId: string,
  verificationStatus: string,
  accessToken: string,
  reason?: string,
) {
  return apiRequest<{ verificationStatus: string }>(`/admin/drivers/${userId}/status`, {
    method: 'POST',
    accessToken,
    body: { verificationStatus, ...(reason ? { reason } : {}) },
  });
}

export function fetchAdminPricing(accessToken: string) {
  return apiRequest<{
    items: {
      id: string;
      serviceKey: string;
      cityCode: string | null;
      vehicleCategory: string | null;
      optionKey: string | null;
      baseFeeKopiyky: number;
      perKmKopiyky: number;
      minFeeKopiyky: number;
      nightMultiplierBps: number;
      weekendMultiplierBps: number;
      config: Record<string, number>;
      active: boolean;
    }[];
  }>('/admin/pricing', { accessToken });
}

export function saveAdminPricing(
  body: {
    serviceKey: 'tow' | 'moving' | 'cargo' | 'roadside';
    cityCode?: string;
    vehicleCategory?: 'car' | 'suv' | 'van' | 'truck' | 'motorcycle';
    optionKey?: string;
    baseFeeKopiyky: number;
    perKmKopiyky: number;
    minFeeKopiyky: number;
    nightMultiplierBps?: number;
    weekendMultiplierBps?: number;
    hourlyFeeKopiyky?: number;
    moverFeeKopiyky?: number;
    floorFeeKopiyky?: number;
    noElevatorFeeKopiyky?: number;
    waitingFeeKopiyky?: number;
    outsideCityPerKmKopiyky?: number;
    active?: boolean;
  },
  accessToken: string,
) {
  return apiRequest<unknown>('/admin/pricing', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function setAdminOrderStatus(
  orderId: string,
  body: { status: 'cancelled' | 'expired' | 'completed' | 'searching'; reason: string },
  accessToken: string,
) {
  return apiRequest<unknown>(`/admin/orders/${orderId}/status`, {
    method: 'POST',
    accessToken,
    body,
  });
}

export function fetchAdminOrderExport(accessToken: string) {
  return apiRequest<{ csv: string }>('/admin/orders/export', { accessToken });
}
