import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, serviceIcon } from './Icon';
import { PressScale } from './PressScale';
import { StatusBadge, type StatusTone } from './StatusBadge';

export function OrderCard({
  serviceKey,
  title,
  date,
  status,
  tone,
  price,
  onPress,
}: {
  serviceKey: string;
  title: string;
  date: string;
  status: string;
  tone: StatusTone;
  price: string;
  onPress: () => void;
}) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.card}>
      <Icon name={serviceIcon(serviceKey)} color={colors.accent} size={22} />
      <View style={styles.copy}>
        <AppText variant="card">{title}</AppText>
        <AppText variant="small" color={colors.secondary}>
          {date}
        </AppText>
      </View>
      <View style={styles.meta}>
        <StatusBadge label={status} tone={tone} />
        <AppText variant="label" color={colors.text} style={styles.price}>
          {price}
        </AppText>
      </View>
      <Icon name="chevron" color={colors.muted} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 1,
    maxWidth: '42%',
  },
  price: {
    textAlign: 'right',
  },
});
