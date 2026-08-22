import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

export function LoadingState() {
  return (
    <View style={styles.wrap}>
      <View style={styles.lineWide} />
      <View style={styles.card} />
      <View style={styles.card} />
      <ActivityIndicator color={colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
    paddingVertical: space.lg,
  },
  lineWide: {
    height: 18,
    width: '46%',
    borderRadius: radius.xs,
    backgroundColor: colors.elevated,
  },
  card: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.elevated,
  },
  spinner: {
    marginTop: space.md,
  },
});
