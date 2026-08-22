import { StyleSheet, View } from 'react-native';

import { copy } from '@/copy/uk';
import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <AppText variant="body" color={colors.error}>
        {message}
      </AppText>
      {onRetry ? <Button label={copy.tryAgain} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.28)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.lg,
  },
});
