import { StyleSheet, View } from 'react-native';

import { copy, paymentMethodLabel } from '@/copy/uk';
import { paymentProvider } from '@/payments/create-payment-provider';
import { PAYMENT_METHODS, type PaymentMethod } from '@/payments/types';
import { colors, radius, space } from '@/theme';
import { AppText, PressScale } from '@/ui';

export function PaymentFields({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <View style={styles.block}>
      <AppText variant="caption" color={colors.muted}>
        {copy.paymentTitle}
      </AppText>
      {paymentProvider.mock ? (
        <AppText variant="caption" color={colors.warning} style={styles.banner}>
          {copy.paymentMockBanner}
        </AppText>
      ) : null}
      <View style={styles.grid}>
        {PAYMENT_METHODS.map((method) => {
          const active = value === method;
          return (
            <PressScale
              key={method}
              accessibilityRole="button"
              accessibilityLabel={paymentMethodLabel(method)}
              onPress={() => onChange(method)}
              style={[styles.tile, active && styles.tileActive]}
            >
              <AppText
                variant="label"
                color={active ? colors.accent : colors.text}
                numberOfLines={1}
                style={styles.label}
              >
                {paymentMethodLabel(method)}
              </AppText>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: space.lg,
  },
  banner: {
    marginTop: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.md,
  },
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
    minWidth: 0,
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
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
