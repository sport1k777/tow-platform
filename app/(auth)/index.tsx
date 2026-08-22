import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { copy } from '@/copy/uk';
import { useSession, type AppMode } from '@/session';
import { colors, radius, shadows, space } from '@/theme';
import { AppText, BrandLogo, Icon, PressScale, Screen } from '@/ui';

export default function AuthRoleScreen() {
  const { selectedRole, selectRole } = useSession();

  async function openPhone(role: AppMode) {
    const next: AppMode = role === 'driver' ? 'driver' : 'customer';
    await selectRole(next);
    router.replace({
      pathname: '/phone',
      params: { role: next },
    });
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        <BrandLogo size={56} labeled />
      </View>
      <AppText variant="hero">{copy.roleTitle}</AppText>
      <AppText variant="body" color={colors.secondary} style={styles.subtitle}>
        {copy.roleSubtitle}
      </AppText>

      <PressScale
        accessibilityRole="button"
        accessibilityState={{ selected: selectedRole === 'customer' }}
        accessibilityLabel={copy.roleCustomer}
        onPress={() => void openPhone('customer')}
        style={[styles.card, selectedRole === 'customer' && styles.cardSelected]}
      >
        <View style={styles.row}>
          <View style={[styles.glyph, selectedRole === 'customer' && styles.glyphSelected]}>
            <Icon name="user" color={colors.accent} size={26} />
          </View>
          <View style={styles.copy}>
            <AppText variant="card">{copy.roleCustomer}</AppText>
            <AppText variant="caption" color={colors.secondary}>
              {copy.roleCustomerHint}
            </AppText>
          </View>
          <Icon name="chevron" color={selectedRole === 'customer' ? colors.accent : colors.muted} />
        </View>
      </PressScale>

      <PressScale
        accessibilityRole="button"
        accessibilityState={{ selected: selectedRole === 'driver' }}
        accessibilityLabel={copy.roleDriver}
        onPress={() => void openPhone('driver')}
        style={[styles.card, selectedRole === 'driver' && styles.cardSelected]}
      >
        <View style={styles.row}>
          <View style={[styles.glyph, selectedRole === 'driver' && styles.glyphSelected]}>
            <Icon name="driver" color={colors.accent} size={26} />
          </View>
          <View style={styles.copy}>
            <AppText variant="card">{copy.roleDriver}</AppText>
            <AppText variant="caption" color={colors.secondary}>
              {copy.roleDriverHint}
            </AppText>
          </View>
          <Icon name="chevron" color={selectedRole === 'driver' ? colors.accent : colors.muted} />
        </View>
      </PressScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    marginBottom: space.giant,
    alignItems: 'flex-start',
  },
  subtitle: {
    marginTop: space.sm,
    marginBottom: space.xxxl,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
    minHeight: 108,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: colors.accent,
    ...shadows.glow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    width: '100%',
  },
  glyph: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphSelected: {
    backgroundColor: colors.accentWash,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: 'center',
  },
});
