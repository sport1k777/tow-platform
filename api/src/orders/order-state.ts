import { orderStatusEnum } from '../db/schema';

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const ACTIVE_JOB_STATUSES: readonly OrderStatus[] = [
  'accepted',
  'driver_en_route',
  'arrived',
  'in_progress',
];

export const SEARCHING_STATUSES: readonly OrderStatus[] = ['searching', 'offered'];

export const CUSTOMER_CANCELABLE_STATUSES: readonly OrderStatus[] = [
  'searching',
  'offered',
  'accepted',
  'driver_en_route',
];

export const DRIVER_CANCELABLE_STATUSES: readonly OrderStatus[] = [
  'accepted',
  'driver_en_route',
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  searching: ['offered', 'cancelled', 'expired'],
  offered: ['accepted', 'searching', 'cancelled', 'expired'],
  accepted: ['driver_en_route', 'completed', 'cancelled'],
  driver_en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

export class InvalidOrderTransitionError extends Error {
  constructor(
    readonly from: OrderStatus | null,
    readonly to: OrderStatus,
  ) {
    super(`Cannot transition order from ${from} to ${to}`);
  }
}

export function isAllowedTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isAllowedTransition(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
}

export function isActiveJobStatus(status: string): boolean {
  return (ACTIVE_JOB_STATUSES as readonly string[]).includes(status);
}
