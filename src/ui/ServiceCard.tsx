import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

export function ServiceCard({
  title,
  hint,
  icon,
  selected,
  onPress,
  style,
}: {
  title: string;
  hint: string;
  icon: IconName;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.card, selected && styles.selected, style]}
    >
      <View style={[styles.glyph, selected && styles.glyphSelected]}>
        <Icon name={icon} color={selected ? colors.accent : colors.text} size={22} />
      </View>
      <View style={styles.copy}>
        <AppText variant="card">{title}</AppText>
        <AppText variant="caption" color={colors.secondary} style={styles.hint}>
          {hint}
        </AppText>
      </View>
      <Icon name="chevron" color={selected ? colors.accent : colors.muted} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 76,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
    ...shadows.glow,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphSelected: {
    backgroundColor: 'rgba(255, 157, 0, 0.18)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hint: {
    flexShrink: 1,
  },
});
