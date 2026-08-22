import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, type } from '@/theme';

export function OTPInput({
  value,
  onChangeText,
  length = 6,
}: {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
}) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length }, (_, index) => {
        const char = value[index] ?? '';
        const active = value.length === index || (value.length === length && index === length - 1);
        return (
          <View key={index} style={[styles.cell, active && styles.cellActive, char ? styles.cellFilled : null]}>
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        accessibilityLabel="OTP"
        autoFocus={false}
        caretHidden
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, length))}
        style={styles.hidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    borderColor: colors.accent,
  },
  cellFilled: {
    backgroundColor: colors.elevated,
  },
  digit: {
    ...type.title,
    fontSize: 22,
    color: colors.text,
  },
  hidden: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.02,
    color: 'transparent',
  },
});
