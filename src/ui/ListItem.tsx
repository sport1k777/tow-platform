import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.error : colors.text;
  const body = (
    <View style={styles.row}>
      <Icon name={icon} color={danger ? colors.error : colors.accent} />
      <View style={styles.copy}>
        <AppText variant="card" color={color}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.secondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress && !danger ? <Icon name="chevron" color={colors.muted} /> : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {body}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
