import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceList } from '@/booking/ChoiceList';
import { cargoKindLabel, cargoKinds, type CargoKind } from '@/booking/options';
import { isServiceKey } from '@/config/services';
import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';
import { AppText, Button, NavBack, Screen } from '@/ui';

export default function CustomerIntakeScreen() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const serviceKey = isServiceKey(service) ? service : 'cargo';
  const [cargoKind, setCargoKind] = useState<CargoKind | null>(null);

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <Button
            label={copy.continue}
            disabled={!cargoKind}
            onPress={() => {
              if (!cargoKind) {
                return;
              }
              router.push({
                pathname: '/customer/map',
                params: { service: serviceKey, cargoKind },
              });
            }}
          />
        </View>
      }
    >
      <NavBack />
      <AppText variant="hero">{copy.transportIntakeTitle}</AppText>
      <AppText variant="body" color={colors.muted} style={styles.subtitle}>
        {copy.transportIntakeSubtitle}
      </AppText>
      <ChoiceList
        options={cargoKinds.map((value) => ({ value, label: cargoKindLabel(value) }))}
        value={cargoKind}
        onChange={setCargoKind}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
