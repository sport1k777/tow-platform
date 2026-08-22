import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { Icon } from './Icon';

export function VehicleCard({
  model,
  service,
  plate,
}: {
  model: string;
  service?: string | null;
  plate?: string | null;
}) {
  return (
    <Card>
      <View style={styles.photo}>
        <Icon name="vehicle" size={36} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="title">{model}</AppText>
        {service ? (
          <AppText variant="caption" color={colors.secondary}>
            {service}
          </AppText>
        ) : null}
        {plate ? <AppText variant="card">{plate}</AppText> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
    marginBottom: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 4,
  },
});
