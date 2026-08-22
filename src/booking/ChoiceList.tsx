import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';
import { AppText, PressScale } from '@/ui';

export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.list}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <PressScale
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.tile, active && styles.tileActive]}
          >
            <AppText
              variant="label"
              color={active ? colors.accent : colors.text}
              numberOfLines={2}
              style={styles.label}
            >
              {option.label}
            </AppText>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
    marginBottom: space.lg,
  },
  tile: {
    width: '100%',
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  tileActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  label: {
    flexShrink: 1,
    width: '100%',
  },
});
