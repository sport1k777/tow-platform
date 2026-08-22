import { StyleSheet, View } from 'react-native';

import type { OrderStatus } from '@/api/orders';
import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

const steps: { status: OrderStatus; label: string }[] = [
  { status: 'searching', label: copy.orderSearching },
  { status: 'accepted', label: copy.orderAccepted },
  { status: 'driver_en_route', label: copy.orderEnRoute },
  { status: 'arrived', label: copy.orderArrived },
  { status: 'completed', label: copy.orderCompleted },
];

function rank(status: OrderStatus): number {
  switch (status) {
    case 'searching':
    case 'offered':
      return 0;
    case 'accepted':
      return 1;
    case 'driver_en_route':
      return 2;
    case 'arrived':
    case 'in_progress':
      return 3;
    case 'completed':
      return 4;
    default:
      return -1;
  }
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const current = rank(status);
  if (status === 'cancelled' || status === 'expired') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const done = current > index;
        const active = current === index;
        const color = done ? colors.success : active ? colors.accent : colors.muted;
        return (
          <View key={step.status} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: color }]}>
              {done ? <Icon name="check" size={12} color={colors.background} /> : null}
            </View>
            <AppText variant="caption" color={color}>
              {step.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
