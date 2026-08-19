import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  InvalidOrderTransitionError,
  isAllowedTransition,
  type OrderStatus,
} from '../src/orders/order-state';

describe('order state machine', () => {
  const allowed: Array<[OrderStatus, OrderStatus]> = [
    ['searching', 'offered'],
    ['searching', 'cancelled'],
    ['searching', 'expired'],
    ['offered', 'accepted'],
    ['offered', 'searching'],
    ['offered', 'cancelled'],
    ['offered', 'expired'],
    ['accepted', 'driver_en_route'],
    ['accepted', 'completed'],
    ['accepted', 'cancelled'],
    ['driver_en_route', 'arrived'],
    ['arrived', 'in_progress'],
    ['in_progress', 'completed'],
  ];

  it('allows the approved transitions', () => {
    for (const [from, to] of allowed) {
      expect(isAllowedTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    }
  });

  it('rejects invalid and terminal transitions', () => {
    const invalid: Array<[OrderStatus, OrderStatus]> = [
      ['searching', 'accepted'],
      ['searching', 'completed'],
      ['offered', 'completed'],
      ['accepted', 'searching'],
      ['accepted', 'offered'],
      ['accepted', 'expired'],
      ['driver_en_route', 'completed'],
      ['completed', 'cancelled'],
      ['cancelled', 'searching'],
      ['expired', 'cancelled'],
      ['expired', 'searching'],
    ];

    for (const [from, to] of invalid) {
      expect(isAllowedTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(InvalidOrderTransitionError);
    }
  });

  it('treats completed, cancelled, and expired as terminal', () => {
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
    expect(ALLOWED_TRANSITIONS.expired).toEqual([]);
  });
});
