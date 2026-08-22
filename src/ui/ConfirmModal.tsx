import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export function ConfirmModal({
  visible,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <View
        style={[
          styles.backdrop,
          { paddingTop: Math.max(insets.top, space.xxl), paddingBottom: Math.max(insets.bottom, space.xxl) },
        ]}
      >
        <View style={[styles.card, { maxHeight: height * 0.82 }]}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <AppText variant="title">{title}</AppText>
            <AppText variant="body" color={colors.secondary}>
              {body}
            </AppText>
            <Button label={primaryLabel} onPress={onPrimary} />
            {secondaryLabel && onSecondary ? (
              <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scroll: {
    padding: space.xxl,
    gap: space.md,
  },
});
