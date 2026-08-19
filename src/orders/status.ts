import type { OrderStatus } from '@/api/orders';
import { copy } from '@/copy/uk';

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'searching':
      return copy.orderSearching;
    case 'offered':
      return copy.orderOffered;
    case 'accepted':
      return copy.orderAccepted;
    case 'driver_en_route':
      return copy.orderEnRoute;
    case 'arrived':
      return copy.orderArrived;
    case 'in_progress':
      return copy.orderInProgress;
    case 'completed':
      return copy.orderCompleted;
    case 'cancelled':
      return copy.orderCancelled;
    case 'expired':
      return copy.orderExpired;
    default:
      return status;
  }
}

export function canCancelStatus(status: OrderStatus): boolean {
  return (
    status === 'searching' ||
    status === 'offered' ||
    status === 'accepted' ||
    status === 'driver_en_route'
  );
}

export function driverCanCancelStatus(status: OrderStatus): boolean {
  return status === 'accepted' || status === 'driver_en_route';
}

export function isOpenOrderStatus(status: OrderStatus): boolean {
  return (
    status === 'searching' ||
    status === 'offered' ||
    status === 'accepted' ||
    status === 'driver_en_route' ||
    status === 'arrived' ||
    status === 'in_progress'
  );
}
