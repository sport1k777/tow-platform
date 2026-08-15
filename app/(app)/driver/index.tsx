import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function DriverHomeScreen() {
  const { switchToCustomerMode, signOut } = useSession();
  const [isOnline, setIsOnline] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.driverHomeTitle}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.cardTitle}>
                {isOnline ? copy.driverOnline : copy.driverOffline}
              </Text>
            </View>
            <Switch
              accessibilityLabel={isOnline ? copy.driverOnline : copy.driverOffline}
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: colors.border, true: colors.online }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{copy.vehicleTitle}</Text>
          <Text style={styles.cardTitle}>{copy.vehiclePlaceholder}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{copy.earningsTitle}</Text>
          <Text style={styles.earnings}>{copy.earningsAmount}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
          onPress={() => {
            switchToCustomerMode();
            router.replace('/customer');
          }}
        >
          <Text style={styles.modeLabel}>{copy.switchToCustomer}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          onPress={() => {
            void signOut().then(() => router.replace('/(auth)'));
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
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  earnings: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '700',
  },
  modeButton: {
    marginTop: 16,
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
