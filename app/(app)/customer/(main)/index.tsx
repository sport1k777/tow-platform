import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { firstBookingHref } from '@/booking/flow';
import { defaultMapRegion } from '@/config/map';
import { copy, greetingLine } from '@/copy/uk';
import { darkMapStyle } from '@/maps/darkStyle';
import { mapProvider } from '@/maps/provider';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  AppText,
  Avatar,
  BrandLogo,
  Button,
  PressScale,
  Screen,
  ServiceCard,
  type IconName,
} from '@/ui';

const services: {
  key: 'tow' | 'roadside' | 'moving' | 'cargo';
  title: string;
  hint: string;
  icon: IconName;
}[] = [
  { key: 'tow', title: copy.serviceTow, hint: copy.serviceTowHint, icon: 'tow' },
  { key: 'roadside', title: copy.serviceRoadside, hint: copy.serviceRoadsideHint, icon: 'roadside' },
  { key: 'moving', title: copy.serviceMoving, hint: copy.serviceMovingHint, icon: 'moving' },
  { key: 'cargo', title: copy.serviceCargo, hint: copy.serviceCargoHint, icon: 'cargo' },
];

export default function CustomerHomeScreen() {
  const { session, switchToDriverMode } = useSession();
  const [region, setRegion] = useState<Region>(defaultMapRegion);
  const [here, setHere] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selected, setSelected] = useState<(typeof services)[number]['key']>('tow');

  useEffect(() => {
    let cancelled = false;
    void mapProvider.getCurrentPosition().then((location) => {
      if (cancelled || !location.ok) {
        return;
      }
      setRegion({
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
      setHere({ latitude: location.lat, longitude: location.lng });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function openService(service: (typeof services)[number]['key']) {
    router.push(firstBookingHref(service));
  }

  return (
    <Screen
      scroll
      embedInTabs
      footer={
        <View style={styles.footer}>
          <Button
            label={selected === 'tow' ? copy.callTow : copy.continue}
            onPress={() => openService(selected)}
          />
        </View>
      }
    >
      <View style={styles.top}>
        <BrandLogo size={36} />
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={copy.profileTitle}
          onPress={() => router.navigate('/customer/profile')}
        >
          <Avatar size={44} name={session.displayName} />
        </PressScale>
      </View>
      <AppText variant="caption" color={colors.secondary}>
        {greetingLine(session.displayName)}
      </AppText>
      <AppText variant="hero" style={styles.hero}>
        {copy.needHelp}
      </AppText>
      <AppText variant="body" color={colors.secondary}>
        {copy.customerHomeSubtitle}
      </AppText>

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          region={region}
          pointerEvents="none"
          pitchEnabled={false}
          rotateEnabled={false}
          userInterfaceStyle="dark"
          customMapStyle={darkMapStyle}
        >
          {here ? <Marker coordinate={here} pinColor={colors.accent} /> : null}
        </MapView>
      </View>

      <AppText variant="section" color={colors.muted} style={styles.section}>
        {copy.whatHappened}
      </AppText>
      <View style={styles.list}>
        {services.map((service) => (
          <ServiceCard
            key={service.key}
            icon={service.icon}
            title={service.title}
            hint={service.hint}
            selected={selected === service.key}
            onPress={() => {
              setSelected(service.key);
              openService(service.key);
            }}
          />
        ))}
      </View>

      {session.canUseAdminMode ? (
        <PressScale onPress={() => router.replace('/admin')} style={styles.link}>
          <AppText variant="caption" color={colors.secondary}>
            {copy.switchToAdmin}
          </AppText>
        </PressScale>
      ) : null}
      {session.canUseDriverMode ? (
        <PressScale
          onPress={() => {
            if (switchToDriverMode()) {
              router.replace('/driver');
            }
          }}
          style={styles.link}
        >
          <AppText variant="caption" color={colors.secondary}>
            {copy.switchToDriver}
          </AppText>
        </PressScale>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  hero: {
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  mapCard: {
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: space.xl,
    marginBottom: space.xl,
  },
  map: {
    flex: 1,
  },
  section: {
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  list: {
    gap: space.md,
  },
  link: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
