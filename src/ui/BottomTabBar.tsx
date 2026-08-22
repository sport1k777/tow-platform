import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { copy } from '@/copy/uk';
import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

export type TabKey = 'home' | 'orders' | 'profile';
export type TabRole = 'customer' | 'driver';

const items: { key: TabKey; icon: IconName; label: string }[] = [
  { key: 'home', icon: 'home', label: copy.tabHome },
  { key: 'orders', icon: 'orders', label: copy.tabOrders },
  { key: 'profile', icon: 'profile', label: copy.tabProfile },
];

export function BottomTabBar({
  role,
  active,
  onSelect,
}: {
  role: TabRole;
  active: TabKey;
  onSelect?: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();

  function go(key: TabKey) {
    if (key === active) {
      return;
    }
    if (onSelect) {
      onSelect(key);
      return;
    }
    if (role === 'customer') {
      if (key === 'home') {
        router.navigate('/customer');
        return;
      }
      if (key === 'orders') {
        router.navigate('/customer/history');
        return;
      }
      router.navigate('/customer/profile');
      return;
    }
    if (key === 'home') {
      router.navigate('/driver');
      return;
    }
    if (key === 'orders') {
      router.navigate('/driver/orders');
      return;
    }
    router.navigate('/driver/profile');
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const on = item.key === active;
          return (
            <PressScale
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={item.label}
              onPress={() => go(item.key)}
              style={styles.item}
            >
              <View style={styles.itemInner}>
                <View style={[styles.indicator, on && styles.indicatorOn]} />
                <Icon name={item.icon} color={on ? colors.accent : colors.muted} size={22} />
                <AppText
                  variant="status"
                  color={on ? colors.accent : colors.muted}
                  numberOfLines={1}
                  style={styles.label}
                >
                  {item.label}
                </AppText>
              </View>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
  },
  label: {
    textAlign: 'center',
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    minHeight: 64,
  },
  item: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  itemInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.sm,
  },
  indicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  indicatorOn: {
    backgroundColor: colors.accent,
  },
});
