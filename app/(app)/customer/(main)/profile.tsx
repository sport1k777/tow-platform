import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateDisplayName } from '@/api/users';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  ListItem,
  Screen,
  SectionHeader,
  TextField,
  userFacingError,
} from '@/ui';

export default function CustomerProfileScreen() {
  const { session, authed, refreshProfile, signOut, switchToDriverMode } = useSession();
  const [name, setName] = useState(session.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await authed((token) => updateDisplayName(name.trim(), token));
      await refreshProfile();
      setOk(true);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      keyboard
      scroll
      embedInTabs
      footer={
        <View style={styles.footer}>
          <Button
            label={copy.profileSave}
            loading={busy}
            disabled={busy || name.trim().length < 2}
            onPress={() => void onSave()}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <Avatar size={88} name={session.displayName} />
        <AppText variant="hero" style={styles.name}>
          {session.displayName || copy.profileTitle}
        </AppText>
        <AppText variant="body" color={colors.secondary}>
          {session.phone ?? ''}
        </AppText>
      </View>

      <SectionHeader title={copy.personalData} />
      <TextField
        accessibilityLabel={copy.profileName}
        placeholder={copy.profileName}
        value={name}
        onChangeText={setName}
      />
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.msg}>
          {error}
        </AppText>
      ) : null}
      {ok ? (
        <AppText variant="caption" color={colors.success} style={styles.msg}>
          {copy.saved}
        </AppText>
      ) : null}

      <Card style={styles.menu}>
        <ListItem
          icon="orders"
          title={copy.myOrders}
          onPress={() => router.navigate('/customer/history')}
        />
        <ListItem icon="payment" title={copy.paymentMethods} subtitle={copy.comingSoon} />
        <ListItem icon="phone" title={copy.contactMethods} subtitle={copy.comingSoon} />
        <ListItem icon="settings" title={copy.settings} subtitle={copy.settingsSoon} />
        <ListItem icon="help" title={copy.help} subtitle={copy.helpSoon} />
        <ListItem icon="share" title={copy.shareApp} subtitle={copy.comingSoon} />
        <ListItem icon="info" title={copy.aboutApp} subtitle={copy.appName} />
        {session.canUseDriverMode ? (
          <ListItem
            icon="driver"
            title={copy.switchToDriver}
            onPress={() => {
              if (switchToDriverMode()) {
                router.replace('/driver');
              }
            }}
          />
        ) : null}
        {session.canUseAdminMode ? (
          <ListItem
            icon="settings"
            title={copy.switchToAdmin}
            onPress={() => router.replace('/admin')}
          />
        ) : null}
        <ListItem
          icon="logout"
          title={copy.signOut}
          danger
          onPress={() => void signOut().then(() => router.replace('/(auth)'))}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: space.xxxl,
    gap: space.sm,
  },
  name: {
    marginTop: space.md,
    textAlign: 'center',
  },
  msg: {
    marginTop: space.md,
  },
  menu: {
    marginTop: space.xl,
    gap: 0,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
