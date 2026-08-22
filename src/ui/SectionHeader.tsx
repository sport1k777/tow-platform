import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="section" color={colors.muted} style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.muted}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.md,
    gap: 4,
  },
  title: {
    textTransform: 'uppercase',
  },
});
