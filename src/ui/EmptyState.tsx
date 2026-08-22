import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  title,
  hint,
  icon = 'orders',
  actionLabel,
  onAction,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon name={icon} color={colors.accent} size={28} />
      </View>
      <AppText variant="card" style={styles.title}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="body" color={colors.secondary} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  title: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    marginTop: space.sm,
  },
  action: {
    marginTop: space.xl,
    alignSelf: 'stretch',
  },
});
