import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchDriverMe, type DriverMe } from '@/api/drivers';
import { deleteAvatar, ownAvatarUri, updateProfile, uploadAvatar } from '@/api/users';
import { copy, serviceTitle, vehicleTitle } from '@/copy/uk';
import {
  isApprovedDriver,
  verificationStatusHint,
  verificationStatusLabel,
} from '@/drivers/verification';
import {
  mediaPickErrorLabel,
  pickAvatarFromCamera,
  pickAvatarFromLibrary,
  validateImage,
  type PickResult,
  type PickedFile,
} from '@/media/pickMedia';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  ActionSheet,
  AppText,
  Avatar,
  Button,
  Card,
  ErrorBanner,
  Icon,
  ListItem,
  PressScale,
  Screen,
  StatusBadge,
  TextField,
  VehicleCard,
  userFacingError,
  verificationTone,
} from '@/ui';

export default function DriverProfileScreen() {
  const { authed, getAccessToken, refreshProfile, signOut, switchToCustomerMode } = useSession();
  const [me, setMe] = useState<DriverMe | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPercent, setAvatarPercent] = useState<number | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<PickedFile | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [avatarBust, setAvatarBust] = useState(1);

  const load = useCallback(async () => {
    try {
      const profile = await authed((token) => fetchDriverMe(token));
      setMe(profile);
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
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

  const token = getAccessToken();
  const avatarUri = ownAvatarUri(Boolean(me?.hasAvatar), avatarBust);
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || me?.displayName;
  const vehicle = me?.vehicles.find((item) => item.active) ?? me?.vehicles[0];
  const verified = isApprovedDriver(me?.verificationStatus);
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  async function onSave() {
    setSaving(true);
    setError(null);
    setOk(false);
    setNotice(null);
    try {
      await authed((access) =>
        updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() }, access),
      );
      await refreshProfile();
      await load();
      setOk(true);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function applyAvatar(file: PickedFile) {
    const invalid = validateImage(file);
    if (invalid) {
      setFailedAvatar(file);
      setError(invalid);
      return;
    }
    setAvatarBusy(true);
    setAvatarPercent(1);
    setError(null);
    setNotice(null);
    setOk(false);
    try {
      await authed((access) => uploadAvatar(file, access, setAvatarPercent));
      setFailedAvatar(null);
      setAvatarBust((value) => value + 1);
      await load();
    } catch {
      setFailedAvatar(file);
      setError(copy.avatarUploadFailed);
    } finally {
      setAvatarBusy(false);
      setAvatarPercent(null);
    }
  }

  function onPickResult(result: PickResult) {
    if (result.status === 'canceled') {
      return;
    }
    if (result.status !== 'success') {
      setFailedAvatar(null);
      setError(mediaPickErrorLabel(result));
      return;
    }
    void applyAvatar(result.file);
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true);
    setError(null);
    setNotice(null);
    try {
      await authed((access) => deleteAvatar(access));
      setFailedAvatar(null);
      setAvatarBust((value) => value + 1);
      await load();
      setNotice(copy.avatarRemoved);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setAvatarBusy(false);
    }
  }

  function onRetryError() {
    if (failedAvatar) {
      void applyAvatar(failedAvatar);
      return;
    }
    void load();
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
            loading={saving}
            disabled={saving || firstName.trim().length < 1 || lastName.trim().length < 1}
            onPress={() => void onSave()}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={copy.changePhoto}
          disabled={avatarBusy}
          onPress={() => setPhotoOpen(true)}
        >
          <Avatar
            uri={avatarUri}
            headers={authHeaders}
            name={displayName}
            size={88}
            loading={avatarBusy}
          />
        </PressScale>
        {avatarBusy && avatarPercent != null ? (
          <AppText variant="caption" color={colors.secondary}>
            {copy.uploadingPercent} {avatarPercent}%
          </AppText>
        ) : null}
        <AppText variant="hero" style={styles.name}>
          {displayName || copy.profileTitle}
        </AppText>
        <AppText variant="body" color={colors.secondary}>
          {me?.phone ?? ''}
        </AppText>
        <View style={styles.rating}>
          <Icon name="star" size={16} color={colors.accent} />
          <AppText variant="card">{me?.rating ?? '—'}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            · {me?.completedOrdersCount ?? 0} {copy.metricOrders.toLowerCase()}
          </AppText>
        </View>
      </View>

      <StatusBadge
        label={verificationStatusLabel(me?.verificationStatus)}
        tone={verificationTone(me?.verificationStatus)}
      />
      <AppText variant="caption" color={verified ? colors.success : colors.secondary} style={styles.hint}>
        {verified ? copy.canReceiveOrders : verificationStatusHint(me?.verificationStatus)}
      </AppText>
      {me?.mockMode ? (
        <AppText variant="caption" color={colors.warning} style={styles.hint}>
          {copy.devVerificationBanner}
        </AppText>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={onRetryError} /> : null}

      <Card style={styles.menu}>
        <ListItem
          icon="verification"
          title={copy.documentsTitle}
          subtitle={verificationStatusLabel(me?.verificationStatus)}
          onPress={() => router.push('/driver/verification')}
        />
      </Card>

      <View style={styles.fields}>
        <TextField
          accessibilityLabel={copy.profileFirstName}
          placeholder={copy.profileFirstName}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextField
          accessibilityLabel={copy.profileLastName}
          placeholder={copy.profileLastName}
          value={lastName}
          onChangeText={setLastName}
        />
        <AppText variant="caption" color={colors.muted}>
          {copy.phoneVerified}: {me?.phone ?? '—'}
        </AppText>
      </View>

      <View style={styles.vehicle}>
        {vehicle ? (
          <VehicleCard
            model={vehicleTitle(vehicle)}
            service={vehicle.services.map(serviceTitle).join(' · ')}
            plate={vehicle.plateNumber ?? copy.vehiclePlaceholder}
          />
        ) : (
          <Card>
            <AppText variant="card">{copy.vehicleTitle}</AppText>
            <AppText variant="caption" color={colors.secondary}>
              {copy.noVehicleYet}
            </AppText>
          </Card>
        )}
      </View>

      <Card style={styles.menu}>
        <ListItem
          icon="user"
          title={copy.switchToCustomer}
          onPress={() => {
            switchToCustomerMode();
            router.replace('/customer');
          }}
        />
        <ListItem
          icon="logout"
          title={copy.signOut}
          danger
          onPress={() => void signOut().then(() => router.replace('/(auth)'))}
        />
      </Card>

      {ok ? (
        <AppText variant="caption" color={colors.success} style={styles.msg}>
          {copy.saved}
        </AppText>
      ) : null}
      {notice ? (
        <AppText variant="caption" color={colors.success} style={styles.msg}>
          {notice}
        </AppText>
      ) : null}

      <ActionSheet
        visible={photoOpen}
        title={copy.changePhoto}
        actions={[
          { id: 'camera', label: copy.takePhoto, icon: 'camera' },
          { id: 'library', label: copy.chooseLibrary, icon: 'gallery' },
          ...(me?.hasAvatar
            ? [{ id: 'remove', label: copy.removePhoto, icon: 'trash' as const, danger: true }]
            : []),
        ]}
        onClose={() => setPhotoOpen(false)}
        onSelect={(id) => {
          setPhotoOpen(false);
          if (id === 'camera') {
            void pickAvatarFromCamera().then((result) => onPickResult(result));
          }
          if (id === 'library') {
            void pickAvatarFromLibrary().then((result) => onPickResult(result));
          }
          if (id === 'remove') {
            void onRemoveAvatar();
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: space.xl,
    gap: space.sm,
  },
  name: {
    marginTop: space.md,
    textAlign: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    marginTop: space.sm,
    marginBottom: space.md,
  },
  fields: {
    gap: space.md,
    marginTop: space.lg,
  },
  vehicle: {
    marginTop: space.lg,
  },
  menu: {
    marginTop: space.lg,
  },
  msg: {
    marginTop: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
