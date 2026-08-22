import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { setAdminDriverStatus } from '@/api/admin';
import { adminAvatarUri, adminDocumentFileUri } from '@/api/users';
import {
  approveAdminDocument,
  fetchAdminDriverVerification,
  rejectAdminDocument,
  requestAdminReupload,
  type DriverVerification,
} from '@/api/verification';
import { copy, vehicleTitle } from '@/copy/uk';
import {
  documentStatusLabel,
  documentTypeLabel,
  formatUaDate,
  verificationStatusLabel,
} from '@/drivers/verification';
import { firstParam } from '@/navigation/params';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  NavBack,
  Screen,
  StatusBadge,
  TextField,
  documentTone,
  userFacingError,
  verificationTone,
} from '@/ui';

export default function AdminDriverReviewScreen() {
  const { authed, getAccessToken } = useSession();
  const driverId = firstParam(useLocalSearchParams().id) ?? '';
  const [data, setData] = useState<DriverVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const token = getAccessToken();
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const load = useCallback(async () => {
    if (!driverId) {
      return;
    }
    try {
      const next = await authed((access) => fetchAdminDriverVerification(driverId, access));
      setData(next);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  }, [authed, driverId]);

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

  async function run(action: () => Promise<DriverVerification | { verificationStatus: string }>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const name =
    [data?.firstName, data?.lastName].filter(Boolean).join(' ') || data?.displayName || copy.driverLabel;
  const vehicle = data?.vehicles.find((item) => item.active) ?? data?.vehicles[0];

  return (
    <Screen scroll>
      <NavBack />
      <AppText variant="hero">{copy.adminDriverDetails}</AppText>
      <View style={styles.header}>
        <Avatar
          uri={adminAvatarUri(driverId, Boolean(data?.hasAvatar))}
          headers={headers}
          name={name}
          size={72}
        />
        <View style={styles.headerCopy}>
          <AppText variant="title">{name}</AppText>
          <AppText variant="caption" color={colors.secondary}>
            {data?.phone}
          </AppText>
          <StatusBadge
            label={verificationStatusLabel(data?.verificationStatus)}
            tone={verificationTone(data?.verificationStatus)}
          />
        </View>
      </View>

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Card style={styles.block}>
        <AppText variant="section" color={colors.muted}>
          {copy.vehicleTitle}
        </AppText>
        {vehicle ? (
          <>
            <AppText variant="card">{vehicleTitle(vehicle)}</AppText>
            <AppText variant="caption" color={colors.secondary}>
              {vehicle.plateNumber ?? '—'} · {vehicle.approved ? copy.verificationApproved : copy.vehicleNotApproved}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" color={colors.secondary}>
            {copy.noVehicleYet}
          </AppText>
        )}
      </Card>

      <View style={styles.list}>
        {(data?.documents ?? []).map((doc) => (
          <Card key={doc.type} style={styles.block}>
            <AppText variant="card">{documentTypeLabel(doc.type)}</AppText>
            <StatusBadge label={documentStatusLabel(doc.status)} tone={documentTone(doc.status)} />
            {doc.expiresAt ? (
              <AppText variant="caption" color={colors.secondary}>
                {copy.documentValidUntil}: {formatUaDate(doc.expiresAt)}
              </AppText>
            ) : null}
            {doc.rejectionReason ? (
              <AppText variant="caption" color={colors.error}>
                {copy.documentReason}: {doc.rejectionReason}
              </AppText>
            ) : null}
            <AppText variant="caption" color={colors.muted}>
              {copy.ocrResults}
            </AppText>
            <AppText variant="caption" color={colors.secondary}>
              {copy.noOcr}
            </AppText>
            <AppText variant="caption" color={colors.secondary}>
              {copy.authenticityUnknown}
            </AppText>
            {doc.id && doc.mimeType !== 'application/pdf' ? (
              <Image
                source={{ uri: adminDocumentFileUri(driverId, doc.id), headers }}
                style={styles.preview}
                resizeMode="contain"
              />
            ) : null}
            {doc.id ? (
              <View style={styles.actions}>
                <Button
                  label={copy.approveDriver}
                  disabled={busy || doc.status === 'not_submitted'}
                  onPress={() => void run(() => authed((access) => approveAdminDocument(doc.id as string, access)))}
                />
                <Button
                  label={copy.rejectDriver}
                  variant="danger"
                  disabled={busy || reason.trim().length < 3}
                  onPress={() =>
                    void run(() => authed((access) => rejectAdminDocument(doc.id as string, reason.trim(), access)))
                  }
                />
                <Button
                  label={copy.requestReupload}
                  variant="secondary"
                  disabled={busy || reason.trim().length < 3}
                  onPress={() =>
                    void run(() => authed((access) => requestAdminReupload(doc.id as string, reason.trim(), access)))
                  }
                />
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      <TextField
        accessibilityLabel={copy.rejectReasonPlaceholder}
        placeholder={copy.rejectReasonPlaceholder}
        value={reason}
        onChangeText={setReason}
      />

      <View style={styles.actions}>
        <Button
          label={copy.approveDriver}
          disabled={busy}
          onPress={() =>
            void run(() => authed((access) => setAdminDriverStatus(driverId, 'approved', access)))
          }
        />
        <Button
          label={copy.rejectDriver}
          variant="danger"
          disabled={busy || reason.trim().length < 3}
          onPress={() =>
            void run(() => authed((access) => setAdminDriverStatus(driverId, 'rejected', access, reason.trim())))
          }
        />
        <Button
          label={copy.suspendDriver}
          variant="secondary"
          disabled={busy}
          onPress={() =>
            void run(() => authed((access) => setAdminDriverStatus(driverId, 'suspended', access)))
          }
        />
        <Button
          label={copy.unsuspendDriver}
          variant="tertiary"
          disabled={busy}
          onPress={() =>
            void run(() =>
              authed((access) => setAdminDriverStatus(driverId, 'under_review', access)),
            )
          }
        />
      </View>

      <AppText variant="section" color={colors.muted} style={styles.history}>
        {copy.auditHistory}
      </AppText>
      {(data?.events ?? []).map((event) => (
        <AppText key={event.id} variant="caption" color={colors.secondary} style={styles.event}>
          {formatUaDate(event.createdAt)} · {event.action}
          {event.reason ? ` · ${event.reason}` : ''}
        </AppText>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: space.lg,
    alignItems: 'center',
    marginTop: space.xl,
    marginBottom: space.lg,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  error: {
    marginTop: space.md,
  },
  block: {
    gap: space.sm,
    marginBottom: space.md,
  },
  list: {
    marginTop: space.md,
  },
  actions: {
    gap: space.sm,
    marginTop: space.md,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
  },
  history: {
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  event: {
    marginBottom: space.sm,
  },
});
