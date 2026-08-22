import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ownDocumentFileUri } from '@/api/users';
import {
  fetchDriverVerification,
  replaceDriverDocument,
  uploadDriverDocument,
  type DocumentType,
  type DriverDocument,
  type DriverVerification,
} from '@/api/verification';
import { copy } from '@/copy/uk';
import {
  documentStatusLabel,
  documentTypeIcon,
  documentTypeLabel,
  formatUaDate,
  verificationStatusHint,
  verificationStatusLabel,
} from '@/drivers/verification';
import {
  mediaPickErrorLabel,
  pickDocumentFile,
  pickDocumentFromCamera,
  pickDocumentFromLibrary,
  validateDocument,
  type MediaSource,
  type PickResult,
  type PickedFile,
} from '@/media/pickMedia';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  ActionSheet,
  AppText,
  Button,
  Card,
  ErrorBanner,
  Icon,
  NavBack,
  Screen,
  StatusBadge,
  documentTone,
  userFacingError,
  verificationTone,
} from '@/ui';

const REQUIREMENTS = [
  copy.uploadReqReadable,
  copy.uploadReqCorners,
  copy.uploadReqGlare,
  copy.uploadReqNoScreenshot,
  copy.uploadReqNotExpired,
  copy.uploadReqClear,
];

function isInFlight(status: DriverDocument['status']): boolean {
  return status === 'uploaded' || status === 'processing';
}

export default function DriverVerificationScreen() {
  const { authed, getAccessToken } = useSession();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [data, setData] = useState<DriverVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<DocumentType | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [failedUpload, setFailedUpload] = useState<{
    doc: DriverDocument;
    file: PickedFile;
  } | null>(null);
  const [pickerFor, setPickerFor] = useState<DriverDocument | null>(null);
  const [requirementsFor, setRequirementsFor] = useState<DriverDocument | null>(null);
  const [preview, setPreview] = useState<DriverDocument | null>(null);
  const [pending, setPending] = useState<{
    doc: DriverDocument;
    file: PickedFile;
    source: MediaSource;
  } | null>(null);
  const [lastPick, setLastPick] = useState<{
    doc: DriverDocument;
    source: MediaSource;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await authed((token) => fetchDriverVerification(token));
      setData(next);
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

  const processingOpen = Boolean(data?.documents.some((doc) => isInFlight(doc.status)));

  useEffect(() => {
    if (!processingOpen || busyType) {
      return;
    }
    const timer = setInterval(() => {
      void load();
    }, 1500);
    return () => {
      clearInterval(timer);
    };
  }, [processingOpen, busyType, load]);

  const token = getAccessToken();
  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  async function applyFile(doc: DriverDocument, file: PickedFile) {
    const invalid = validateDocument(file);
    if (invalid) {
      setFailedUpload({ doc, file });
      setError(invalid);
      return;
    }
    setBusyType(doc.type);
    setUploadPercent(1);
    setError(null);
    try {
      const next = doc.id
        ? await authed((access) =>
            replaceDriverDocument(doc.id as string, file, access, setUploadPercent),
          )
        : await authed((access) => uploadDriverDocument(doc.type, file, access, setUploadPercent));
      setFailedUpload(null);
      setData(next);
    } catch {
      setFailedUpload({ doc, file });
      setError(copy.uploadFailed);
    } finally {
      setBusyType(null);
      setUploadPercent(null);
    }
  }

  function onPickResult(doc: DriverDocument, source: MediaSource, result: PickResult) {
    setLastPick({ doc, source });
    if (result.status === 'canceled') {
      return;
    }
    if (result.status !== 'success') {
      setFailedUpload(null);
      setError(mediaPickErrorLabel(result));
      return;
    }
    const invalid = validateDocument(result.file);
    if (invalid) {
      setFailedUpload(null);
      setError(invalid);
      return;
    }
    setError(null);
    setPending({ doc, file: result.file, source });
  }

  async function pickFor(doc: DriverDocument, source: MediaSource) {
    const result =
      source === 'camera'
        ? await pickDocumentFromCamera()
        : source === 'library'
          ? await pickDocumentFromLibrary()
          : await pickDocumentFile();
    onPickResult(doc, source, result);
  }

  function onRetryError() {
    if (failedUpload) {
      void applyFile(failedUpload.doc, failedUpload.file);
      return;
    }
    if (lastPick) {
      void pickFor(lastPick.doc, lastPick.source);
      return;
    }
    void load();
  }

  function ctaLabel(doc: DriverDocument): string {
    if (doc.status === 'not_submitted') {
      return copy.documentUpload;
    }
    if (doc.status === 'rejected') {
      return copy.documentReupload;
    }
    if (doc.status === 'expired') {
      return copy.documentUpdate;
    }
    return copy.documentReplace;
  }

  return (
    <Screen scroll>
      <NavBack />
      <AppText variant="hero">{copy.documentsTitle}</AppText>
      {data?.mockMode ? (
        <AppText variant="caption" color={colors.warning} style={styles.banner}>
          {copy.devVerificationBanner}
        </AppText>
      ) : null}
      {data && !data.providerConfigured ? (
        <AppText variant="caption" color={colors.secondary} style={styles.banner}>
          {copy.providerNotConfigured}
        </AppText>
      ) : null}

      <StatusBadge
        label={verificationStatusLabel(data?.verificationStatus)}
        tone={verificationTone(data?.verificationStatus)}
      />
      <AppText variant="caption" color={colors.secondary} style={styles.hint}>
        {verificationStatusHint(data?.verificationStatus)}
      </AppText>
      {data?.verificationStatus === 'pending_verification' ||
      data?.verificationStatus === 'under_review' ? (
        <AppText variant="caption" color={colors.muted}>
          {copy.documentsNotify}
        </AppText>
      ) : null}

      <AppText variant="section" color={colors.muted} style={styles.progress}>
        {data ? `${data.approvedCount}/${data.requiredCount} ${copy.documentsProgress}` : copy.loading}
      </AppText>

      {error ? <ErrorBanner message={error} onRetry={onRetryError} /> : null}

      <View style={styles.list}>
        {(data?.documents ?? []).map((doc) => {
          const uploading = busyType === doc.type;
          const inFlight = uploading || isInFlight(doc.status);
          return (
            <Card key={doc.type} style={styles.card}>
              <View style={styles.cardHead}>
                <Icon name={documentTypeIcon(doc.type)} color={colors.accent} />
                <View style={styles.cardCopy}>
                  <AppText variant="card">{documentTypeLabel(doc.type)}</AppText>
                  <StatusBadge label={documentStatusLabel(doc.status)} tone={documentTone(doc.status)} />
                </View>
              </View>
              {inFlight ? (
                <View style={styles.processing}>
                  <ActivityIndicator color={colors.accent} />
                  <AppText variant="caption" color={colors.secondary}>
                    {uploading && uploadPercent != null && uploadPercent < 100
                      ? `${copy.uploadingPercent} ${uploadPercent}%`
                      : copy.documentProcessing}
                  </AppText>
                </View>
              ) : null}
              {doc.status === 'rejected' && doc.rejectionReason ? (
                <AppText variant="caption" color={colors.error}>
                  {copy.documentReason}: {doc.rejectionReason}
                </AppText>
              ) : null}
              {doc.status === 'expired' && doc.expiresAt ? (
                <AppText variant="caption" color={colors.error}>
                  {copy.documentValidUntil}: {formatUaDate(doc.expiresAt)}
                </AppText>
              ) : null}
              <View style={styles.actions}>
                {doc.id && doc.status !== 'not_submitted' ? (
                  <Button
                    label={copy.documentView}
                    variant="secondary"
                    onPress={() => setPreview(doc)}
                  />
                ) : null}
                <Button
                  label={ctaLabel(doc)}
                  loading={uploading}
                  disabled={Boolean(busyType)}
                  onPress={() => setRequirementsFor(doc)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <ActionSheet
        visible={Boolean(pickerFor)}
        title={copy.documentUpload}
        actions={[
          { id: 'camera', label: copy.takePhoto, icon: 'camera' },
          { id: 'library', label: copy.chooseLibrary, icon: 'gallery' },
          { id: 'file', label: copy.chooseFile, icon: 'file' },
        ]}
        onClose={() => setPickerFor(null)}
        onSelect={(id) => {
          const doc = pickerFor;
          setPickerFor(null);
          if (!doc) {
            return;
          }
          if (id === 'camera' || id === 'library' || id === 'file') {
            void pickFor(doc, id);
          }
        }}
      />

      <Modal
        visible={Boolean(requirementsFor)}
        transparent
        animationType="fade"
        onRequestClose={() => setRequirementsFor(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              paddingTop: Math.max(insets.top, space.xl),
              paddingBottom: Math.max(insets.bottom, space.xl),
            },
          ]}
        >
          <Card style={[styles.modalCard, { maxHeight: windowHeight * 0.82 }]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              <AppText variant="title">{copy.uploadRequirementsTitle}</AppText>
              {REQUIREMENTS.map((item) => (
                <View key={item} style={styles.reqRow}>
                  <Icon name="check" size={16} color={colors.accent} />
                  <AppText variant="caption" style={styles.reqText}>
                    {item}
                  </AppText>
                </View>
              ))}
              <Button
                label={copy.continue}
                onPress={() => {
                  const doc = requirementsFor;
                  setRequirementsFor(null);
                  setPickerFor(doc);
                }}
              />
              <Button label={copy.cancel} variant="tertiary" onPress={() => setRequirementsFor(null)} />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pending)}
        transparent
        animationType="fade"
        onRequestClose={() => setPending(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              paddingTop: Math.max(insets.top, space.xl),
              paddingBottom: Math.max(insets.bottom, space.xl),
            },
          ]}
        >
          <Card style={[styles.modalCard, { maxHeight: windowHeight * 0.82 }]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              <AppText variant="title">{copy.documentPreviewTitle}</AppText>
              {pending && pending.file.type !== 'application/pdf' ? (
                <Image
                  source={{ uri: pending.file.uri }}
                  style={[styles.preview, { maxHeight: Math.min(280, windowHeight * 0.4) }]}
                  resizeMode="contain"
                />
              ) : (
                <AppText variant="caption" color={colors.secondary}>
                  {pending?.file.name ?? 'PDF'}
                </AppText>
              )}
              <Button
                label={copy.confirmDocument}
                disabled={Boolean(busyType)}
                onPress={() => {
                  if (!pending) {
                    return;
                  }
                  const next = pending;
                  setPending(null);
                  void applyFile(next.doc, next.file);
                }}
              />
              <Button
                label={pending?.source === 'camera' ? copy.retakePhoto : copy.chooseAnotherFile}
                variant="secondary"
                disabled={Boolean(busyType)}
                onPress={() => {
                  if (!pending) {
                    return;
                  }
                  const next = pending;
                  setPending(null);
                  void pickFor(next.doc, next.source);
                }}
              />
              <Button
                label={copy.cancel}
                variant="tertiary"
                disabled={Boolean(busyType)}
                onPress={() => setPending(null)}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View
          style={[
            styles.modalBackdrop,
            {
              paddingTop: Math.max(insets.top, space.xl),
              paddingBottom: Math.max(insets.bottom, space.xl),
            },
          ]}
        >
          <Card style={[styles.modalCard, { maxHeight: windowHeight * 0.82 }]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              <AppText variant="title">{preview ? documentTypeLabel(preview.type) : ''}</AppText>
              {preview?.id && preview.mimeType !== 'application/pdf' ? (
                <Image
                  source={{ uri: ownDocumentFileUri(preview.id), headers }}
                  style={[styles.preview, { maxHeight: Math.min(280, windowHeight * 0.4) }]}
                  resizeMode="contain"
                />
              ) : (
                <AppText variant="caption" color={colors.secondary}>
                  PDF
                </AppText>
              )}
              <Button label={copy.close} variant="secondary" onPress={() => setPreview(null)} />
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: space.md,
  },
  hint: {
    marginTop: space.sm,
  },
  progress: {
    marginTop: space.xl,
    marginBottom: space.md,
  },
  list: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
  card: {
    gap: space.md,
  },
  cardHead: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: space.sm,
  },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  actions: {
    gap: space.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: space.xl,
  },
  modalCard: {
    gap: space.md,
    overflow: 'hidden',
  },
  reqRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
  },
  reqText: {
    flex: 1,
    minWidth: 0,
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
  },
});
