import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchAdminPricing, saveAdminPricing } from '@/api/admin';
import { copy, serviceTitle } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import { AppText, Button, Card, NavBack, Screen, TextField, userFacingError } from '@/ui';

const SERVICES = ['tow', 'moving', 'cargo', 'roadside'] as const;
type ServiceKey = (typeof SERVICES)[number];

function isServiceKey(value: string): value is ServiceKey {
  return SERVICES.includes(value as ServiceKey);
}

export default function AdminPricingScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<
    {
      id: string;
      serviceKey: string;
      cityCode: string | null;
      vehicleCategory: string | null;
      optionKey: string | null;
      baseFeeKopiyky: number;
      perKmKopiyky: number;
      minFeeKopiyky: number;
      active: boolean;
    }[]
  >([]);
  const [serviceKey, setServiceKey] = useState('tow');
  const [cityCode, setCityCode] = useState('kyiv');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [optionKey, setOptionKey] = useState('');
  const [base, setBase] = useState('80000');
  const [perKm, setPerKm] = useState('2000');
  const [min, setMin] = useState('80000');
  const [hourly, setHourly] = useState('50000');
  const [mover, setMover] = useState('40000');
  const [floorFee, setFloorFee] = useState('6000');
  const [noElevator, setNoElevator] = useState('40000');
  const [waiting, setWaiting] = useState('3000');
  const [outsideKm, setOutsideKm] = useState('2500');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchAdminPricing(token));
      setItems(next.items);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  }, [authed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await load();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter(
        (rule) =>
          rule.active &&
          rule.serviceKey === serviceKey.trim() &&
          (cityCode.trim() ? rule.cityCode === cityCode.trim() : true),
      ),
    [cityCode, items, serviceKey],
  );

  async function onSave() {
    const key = serviceKey.trim();
    if (!isServiceKey(key)) {
      setError(copy.priceService);
      return;
    }
    try {
      await authed((token) =>
        saveAdminPricing(
          {
            serviceKey: key,
            cityCode: cityCode.trim() || undefined,
            vehicleCategory: vehicleCategory.trim()
              ? (vehicleCategory.trim() as 'car' | 'suv' | 'van' | 'truck' | 'motorcycle')
              : undefined,
            optionKey: optionKey.trim() || undefined,
            baseFeeKopiyky: Number(base),
            perKmKopiyky: Number(perKm),
            minFeeKopiyky: Number(min),
            hourlyFeeKopiyky: Number(hourly),
            moverFeeKopiyky: Number(mover),
            floorFeeKopiyky: Number(floorFee),
            noElevatorFeeKopiyky: Number(noElevator),
            waitingFeeKopiyky: Number(waiting),
            outsideCityPerKmKopiyky: Number(outsideKm),
            active: true,
          },
          token,
        ),
      );
      await load();
    } catch (caught) {
      setError(userFacingError(caught));
    }
  }

  return (
    <Screen keyboard scroll>
      <NavBack />
      <AppText variant="hero">{copy.adminPricing}</AppText>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.form}>
        <TextField
          accessibilityLabel={copy.priceService}
          autoCapitalize="none"
          placeholder={copy.priceService}
          value={serviceKey}
          onChangeText={setServiceKey}
        />
        <TextField
          accessibilityLabel={copy.priceCity}
          autoCapitalize="none"
          placeholder={copy.priceCity}
          value={cityCode}
          onChangeText={setCityCode}
        />
        <TextField
          accessibilityLabel={copy.summaryVehicle}
          autoCapitalize="none"
          placeholder={copy.summaryVehicle}
          value={vehicleCategory}
          onChangeText={setVehicleCategory}
        />
        <TextField
          accessibilityLabel={copy.priceOption}
          autoCapitalize="none"
          placeholder={copy.priceOption}
          value={optionKey}
          onChangeText={setOptionKey}
        />
        <TextField
          accessibilityLabel={copy.priceBase}
          keyboardType="number-pad"
          placeholder={copy.priceBase}
          value={base}
          onChangeText={setBase}
        />
        <TextField
          accessibilityLabel={copy.pricePerKm}
          keyboardType="number-pad"
          placeholder={copy.pricePerKm}
          value={perKm}
          onChangeText={setPerKm}
        />
        <TextField
          accessibilityLabel={copy.priceMin}
          keyboardType="number-pad"
          placeholder={copy.priceMin}
          value={min}
          onChangeText={setMin}
        />
        <TextField
          accessibilityLabel={copy.priceHourly}
          keyboardType="number-pad"
          placeholder={copy.priceHourly}
          value={hourly}
          onChangeText={setHourly}
        />
        <TextField
          accessibilityLabel={copy.priceMover}
          keyboardType="number-pad"
          placeholder={copy.priceMover}
          value={mover}
          onChangeText={setMover}
        />
        <TextField
          accessibilityLabel={copy.priceFloor}
          keyboardType="number-pad"
          placeholder={copy.priceFloor}
          value={floorFee}
          onChangeText={setFloorFee}
        />
        <TextField
          accessibilityLabel={copy.priceNoElevator}
          keyboardType="number-pad"
          placeholder={copy.priceNoElevator}
          value={noElevator}
          onChangeText={setNoElevator}
        />
        <TextField
          accessibilityLabel={copy.priceWaiting}
          keyboardType="number-pad"
          placeholder={copy.priceWaiting}
          value={waiting}
          onChangeText={setWaiting}
        />
        <TextField
          accessibilityLabel={copy.priceOutsideKm}
          keyboardType="number-pad"
          placeholder={copy.priceOutsideKm}
          value={outsideKm}
          onChangeText={setOutsideKm}
        />
        <Button label={copy.profileSave} onPress={() => void onSave()} />
      </View>

      <View style={styles.list}>
        {visible.map((rule) => (
          <Card key={rule.id} style={styles.card}>
            <AppText variant="card">
              {serviceTitle(rule.serviceKey)} {rule.cityCode ?? ''} {rule.vehicleCategory ?? ''}{' '}
              {rule.optionKey ?? ''}
            </AppText>
            <AppText variant="title" color={colors.accent}>
              {formatUah(rule.baseFeeKopiyky)}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {rule.active ? copy.onlineTitle : copy.offlineTitle}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: space.md,
  },
  form: {
    marginTop: space.xl,
    gap: space.md,
  },
  list: {
    marginTop: space.xl,
    gap: space.md,
    paddingBottom: space.xxl,
  },
  card: {
    gap: 6,
  },
});
