import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

const services = [
  { key: 'tow', title: copy.serviceTow, hint: copy.serviceTowHint, urgent: true },
  { key: 'moving', title: copy.serviceMoving, hint: copy.serviceMovingHint, urgent: false },
  { key: 'cargo', title: copy.serviceCargo, hint: copy.serviceCargoHint, urgent: false },
  { key: 'roadside', title: copy.serviceRoadside, hint: copy.serviceRoadsideHint, urgent: false },
] as const;

export default function CustomerHomeScreen() {
  const { session, switchToDriverMode, signOut } = useSession();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.customerHomeTitle}</Text>
        <Text style={styles.subtitle}>{copy.customerHomeSubtitle}</Text>

        <View style={styles.grid}>
          {services.map((service) => (
            <Pressable
              key={service.key}
              accessibilityRole="button"
              accessibilityLabel={service.title}
              style={({ pressed }) => [
                styles.tile,
                service.urgent && styles.urgentTile,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tileTitle, service.urgent && styles.urgentTitle]}>
                {service.title}
              </Text>
              <Text style={styles.tileHint}>{service.hint}</Text>
            </Pressable>
          ))}
        </View>

        {session.canUseDriverMode ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
            onPress={() => {
              if (switchToDriverMode()) {
                router.replace('/driver');
              }
            }}
          >
            <Text style={styles.modeLabel}>{copy.switchToDriver}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          onPress={() => {
            signOut();
            router.replace('/(auth)');
          }}
        >
          <Text style={styles.signOutLabel}>{copy.signOut}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  brand: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  urgentTile: {
    borderColor: colors.accent,
    backgroundColor: '#FFF6F0',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  urgentTitle: {
    color: colors.accent,
  },
  tileHint: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  modeButton: {
    marginTop: 28,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modeLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  signOut: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
