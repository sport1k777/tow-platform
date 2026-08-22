import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';

export type StatusTone = 'accent' | 'success' | 'danger' | 'warning' | 'muted';

const tones: Record<StatusTone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentWash, fg: colors.accent },
  success: { bg: 'rgba(48, 209, 88, 0.16)', fg: colors.success },
  danger: { bg: 'rgba(255, 69, 58, 0.16)', fg: colors.error },
  warning: { bg: 'rgba(255, 214, 10, 0.16)', fg: colors.warning },
  muted: { bg: colors.elevated, fg: colors.muted },
};

export function StatusBadge({ label, tone = 'muted' }: { label: string; tone?: StatusTone }) {
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <AppText variant="status" color={palette.fg} numberOfLines={2} style={styles.label}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  label: {
    flexShrink: 1,
  },
});
