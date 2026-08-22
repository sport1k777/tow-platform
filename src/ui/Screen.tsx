import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme';

import { BottomTabBar, type TabKey, type TabRole } from './BottomTabBar';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  footer?: ReactNode;
  tab?: TabKey;
  role?: TabRole;
  embedInTabs?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll,
  keyboard,
  footer,
  tab,
  role = 'customer',
  embedInTabs = false,
  style,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, space.sm);
  const inTabs = Boolean(tab) || embedInTabs;
  const footerPad = inTabs ? 0 : bottomSafe;

  const padded = (
    <View
      style={[
        styles.body,
        { paddingBottom: footer || inTabs ? space.md : bottomSafe },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const footerNode = footer ? (
    <View style={[styles.footer, { paddingBottom: footerPad }]}>{footer}</View>
  ) : null;

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Boolean(keyboard)}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: footer || inTabs ? space.xxxl : space.xxxl + bottomSafe },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    padded
  );

  const column = (
    <>
      {inner}
      {footerNode}
    </>
  );

  const framed = keyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {column}
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.flex}>{column}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        {framed}
        {tab && !embedInTabs ? <BottomTabBar role={role} active={tab} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  footer: {
    paddingTop: space.md,
  },
});
