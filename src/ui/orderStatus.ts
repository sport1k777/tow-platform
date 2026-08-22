import type { OrderStatus } from '@/api/orders';

import type { StatusTone } from './StatusBadge';

export function orderStatusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'expired':
      return 'danger';
    case 'searching':
    case 'offered':
      return 'accent';
    default:
      return 'warning';
  }
}

export function verificationTone(status?: string | null): StatusTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
    case 'suspended':
    case 'expired':
      return 'danger';
    case 'under_review':
    case 'pending_verification':
      return 'warning';
    default:
      return 'accent';
  }
}

export function documentTone(status?: string | null): StatusTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
    case 'expired':
      return 'danger';
    case 'processing':
    case 'needs_review':
    case 'uploaded':
      return 'warning';
    default:
      return 'muted';
  }
}
