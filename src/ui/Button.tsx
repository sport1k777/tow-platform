import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { colors, radius, type } from '@/theme';

import { PressScale } from './PressScale';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  accessibilityLabel?: string;
}) {
  const inactive = disabled || loading;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={inactive}
      onPress={onPress}
      style={[styles.base, styles[variant], inactive && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.text} />
      ) : (
        <Text style={[styles.label, labelColor[variant]]} numberOfLines={2}>
          {label}
        </Text>
      )}
    </PressScale>
  );
}

const labelColor = {
  primary: { color: '#080B0F' },
  secondary: { color: colors.text },
  tertiary: { color: colors.muted },
  danger: { color: colors.text },
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tertiary: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  danger: {
    backgroundColor: 'rgba(255, 69, 58, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.35)',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...type.label,
    textAlign: 'center',
    flexShrink: 1,
  },
});
