import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { API_URL } from '@/api/client';
import { copy } from '@/copy/uk';
import { parseAuthRole } from '@/navigation/params';
import {
  formatLocalUa,
  isCompleteUaMobile,
  localDigitsFromInput,
  toE164,
  uaPhonePrefix,
} from '@/phone/ua';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import {
  AppText,
  BrandLogo,
  Button,
  OTPInput,
  Screen,
  TextField,
  userFacingError,
} from '@/ui';

const RESEND_SECONDS = 30;

export default function AuthPhoneScreen() {
  const { requestOtp, verifyOtp, selectedRole, selectRole } = useSession();
  const params = useLocalSearchParams<{ role?: string | string[] }>();
  const paramRole = parseAuthRole(params.role);
  const role = paramRole ?? selectedRole;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (paramRole && paramRole !== selectedRole) {
      void selectRole(paramRole);
    }
  }, [paramRole, selectRole, selectedRole]);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  if (!role) {
    return <Redirect href="/(auth)" />;
  }

  async function onRequestCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestOtp(toE164(phone));
      setCodeSent(true);
      setSeconds(RESEND_SECONDS);
      if (__DEV__ && result.otpMode === 'mock' && result.devCode) {
        setDevOtp(result.devCode);
        setCode(result.devCode);
      } else {
        setDevOtp(null);
      }
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    const chosen = role === 'driver' ? 'driver' : 'customer';
    setBusy(true);
    setError(null);
    try {
      await selectRole(chosen);
      await verifyOtp(toE164(phone), code, chosen);
      router.replace(chosen === 'driver' ? '/driver' : '/customer');
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
      footer={
        <View style={styles.footer}>
          <Button
            label={codeSent ? copy.confirmOtp : copy.requestCode}
            loading={busy}
            disabled={
              busy ||
              (!codeSent && !isCompleteUaMobile(phone)) ||
              (codeSent && code.length !== 6)
            }
            onPress={() => void (codeSent ? onVerify() : onRequestCode())}
          />
          {codeSent ? (
            <Button
              label={seconds > 0 ? `${copy.resendIn} ${seconds}с` : copy.resendCode}
              variant="secondary"
              disabled={busy || seconds > 0}
              onPress={() => void onRequestCode()}
            />
          ) : null}
          <Button
            label={copy.backToRole}
            variant="tertiary"
            disabled={busy}
            onPress={() => router.replace('/(auth)')}
          />
        </View>
      }
    >
      <BrandLogo size={40} />
      <AppText variant="caption" color={colors.secondary} style={styles.brand}>
        {copy.brandShort}
      </AppText>
      <AppText variant="hero" style={styles.title}>
        {codeSent
          ? copy.enterCode
          : role === 'driver'
            ? copy.authDriverTitle
            : copy.authCustomerTitle}
      </AppText>
      <AppText variant="body" color={colors.secondary} style={styles.subtitle}>
        {codeSent
          ? `${copy.otpSentPrefix} ${uaPhonePrefix}${formatLocalUa(phone)}`
          : role === 'driver'
            ? copy.authDriverSubtitle
            : copy.authCustomerSubtitle}
      </AppText>

      {__DEV__ ? (
        <View style={styles.devBox}>
          <AppText variant="status" color={colors.warning}>
            {copy.devOtpBanner}
          </AppText>
          {devOtp ? (
            <AppText variant="card" color={colors.accent}>
              {copy.devOtpLabel}: {devOtp}
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.muted} numberOfLines={1}>
              {API_URL}
            </AppText>
          )}
        </View>
      ) : null}

      <TextField
        accessibilityLabel={copy.phonePlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="number-pad"
        maxLength={12}
        prefix={uaPhonePrefix}
        placeholder={copy.phoneLocalHint}
        value={formatLocalUa(phone)}
        onChangeText={(value) => setPhone(localDigitsFromInput(value))}
      />

      {codeSent ? (
        <View style={styles.otp}>
          <OTPInput value={code} onChangeText={setCode} />
        </View>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    letterSpacing: 3,
    marginTop: space.sm,
  },
  title: {
    marginTop: space.xxl,
  },
  subtitle: {
    marginTop: space.sm,
    marginBottom: space.xxl,
  },
  otp: {
    marginTop: space.lg,
  },
  error: {
    marginTop: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.md,
    backgroundColor: colors.background,
  },
  devBox: {
    backgroundColor: 'rgba(255, 214, 10, 0.08)',
    borderColor: 'rgba(255, 214, 10, 0.28)',
    borderWidth: 1,
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.lg,
    gap: 6,
  },
});
