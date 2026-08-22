import { router, usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';

import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

export function NavBack({ label = copy.back }: { label?: string }) {
  const pathname = usePathname();

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        if (pathname.startsWith('/customer')) {
          router.replace('/customer');
          return;
        }
        if (pathname.startsWith('/driver')) {
          router.replace('/driver');
          return;
        }
        if (pathname.startsWith('/admin')) {
          router.replace('/admin');
          return;
        }
        router.replace('/');
      }}
      style={styles.row}
    >
      <Icon name="back" color={colors.secondary} size={22} />
      <AppText variant="caption" color={colors.secondary}>
        {label}
      </AppText>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.lg,
    paddingVertical: space.xs,
  },
});
