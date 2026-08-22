import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { copy } from '@/copy/uk';
import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

export type SheetAction = {
  id: string;
  label: string;
  icon: IconName;
  danger?: boolean;
};

export function ActionSheet({
  visible,
  title,
  actions,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, space.md), maxHeight: '80%' },
          ]}
          onPress={() => undefined}
        >
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            <AppText variant="section" color={colors.muted} style={styles.title}>
              {title}
            </AppText>
            {actions.map((action) => (
              <PressScale
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => onSelect(action.id)}
                style={styles.row}
              >
                <Icon name={action.icon} color={action.danger ? colors.error : colors.accent} />
                <AppText
                  variant="card"
                  color={action.danger ? colors.error : colors.text}
                  style={styles.actionLabel}
                >
                  {action.label}
                </AppText>
              </PressScale>
            ))}
            <PressScale accessibilityRole="button" onPress={onClose} style={styles.cancel}>
              <AppText variant="label" color={colors.secondary}>
                {copy.cancel}
              </AppText>
            </PressScale>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    overflow: 'hidden',
  },
  title: {
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.sm,
  },
  actionLabel: {
    flex: 1,
    minWidth: 0,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
});
