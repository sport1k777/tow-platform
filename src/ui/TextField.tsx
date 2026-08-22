import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, space, type } from '@/theme';

export const TextField = forwardRef<TextInput, TextInputProps & { prefix?: string }>(
  function TextField({ prefix, style, ...rest }, ref) {
    return (
      <View style={styles.wrap}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          {...rest}
          style={[styles.input, style]}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: space.lg,
    width: '100%',
  },
  prefix: {
    ...type.card,
    color: colors.accent,
    marginRight: space.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 17,
    paddingVertical: 14,
  },
});
