import { Linking, StyleSheet, View } from 'react-native';

import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';

export function DriverCard({
  name,
  rating,
  completed,
  vehicle,
  plate,
  eta,
  distance,
  phone,
}: {
  name: string;
  rating?: number | null;
  completed?: number | null;
  vehicle?: string | null;
  plate?: string | null;
  eta?: string | null;
  distance?: string | null;
  phone?: string | null;
}) {
  return (
    <Card elevated>
      <View style={styles.row}>
        <Avatar name={name} size={64} />
        <View style={styles.copy}>
          <AppText variant="title">{name}</AppText>
          <View style={styles.meta}>
            {rating != null ? (
              <View style={styles.rating}>
                <Icon name="star" size={14} color={colors.accent} />
                <AppText variant="caption">{rating.toFixed(1)}</AppText>
              </View>
            ) : null}
            {completed != null ? (
              <AppText variant="caption" color={colors.secondary}>
                {completed} {copy.metricOrders.toLowerCase()}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
      {vehicle || plate ? (
        <View style={styles.vehicle}>
          <AppText variant="card">{vehicle ?? copy.vehicleTitle}</AppText>
          {plate ? (
            <AppText variant="caption" color={colors.secondary}>
              {plate}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {eta || distance ? (
        <AppText variant="caption" color={colors.secondary}>
          {[eta, distance].filter(Boolean).join(' · ')}
        </AppText>
      ) : null}
      {phone ? (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label={copy.callDriver} onPress={() => void Linking.openURL(`tel:${phone}`)} />
          </View>
          <View style={styles.flex}>
            <Button
              label={copy.writeDriver}
              variant="secondary"
              onPress={() => void Linking.openURL(`sms:${phone}`)}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.lg,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicle: {
    marginTop: space.lg,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.lg,
  },
  flex: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
    minWidth: 0,
  },
});
