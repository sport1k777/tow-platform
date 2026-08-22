import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';
import { AppText, Card } from '@/ui';

export type SummaryRow = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export function BookingSummary({ rows }: { rows: SummaryRow[] }) {
  return (
    <Card elevated style={styles.card}>
      {rows.map((row, index) => (
        <View key={`${row.label}-${index}`} style={styles.block}>
          <AppText variant="caption" color={colors.muted}>
            {row.label}
          </AppText>
          {row.value ? (
            <AppText
              variant={row.emphasize ? 'hero' : 'card'}
              color={row.emphasize ? colors.accent : colors.text}
              style={styles.value}
            >
              {row.value}
            </AppText>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.lg,
    gap: 6,
  },
  block: {
    marginTop: space.md,
    gap: 4,
  },
  value: {
    flexShrink: 1,
  },
});
