import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatLocalUa,
  isCompleteUaMobile,
  localDigitsFromInput,
  toE164,
  uaPhonePrefix,
} from '@/phone/ua';
import { copy } from '@/copy/uk';
import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AuthScreen() {
  const { requestOtp, verifyOtp } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRequestCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestOtp(toE164(phone));
      setCodeSent(true);
      if (result.devCode) {
        setCode(result.devCode);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.authError);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(toE164(phone), code);
      router.replace('/customer');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <Text style={styles.title}>{copy.authTitle}</Text>
        <Text style={styles.subtitle}>{copy.authSubtitle}</Text>

        <Text style={styles.prefix}>{uaPhonePrefix}</Text>
        <TextInput
          accessibilityLabel={copy.phonePlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          maxLength={11}
          placeholder={copy.phoneLocalHint}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={formatLocalUa(phone)}
          onChangeText={(value) => setPhone(localDigitsFromInput(value))}
        />

        {codeSent ? (
          <TextInput
            accessibilityLabel={copy.otpPlaceholder}
            keyboardType="number-pad"
            maxLength={6}
            placeholder={copy.otpPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={code}
            onChangeText={setCode}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy || (!codeSent && !isCompleteUaMobile(phone))}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={codeSent ? onVerify : onRequestCode}
        >
          <Text style={styles.primaryLabel}>
            {codeSent ? copy.verifyCode : copy.requestCode}
          </Text>
        </Pressable>

        {codeSent ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={onRequestCode}
          >
            <Text style={styles.secondaryLabel}>{copy.resendCode}</Text>
          </Pressable>
        ) : null}
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 36,
  },
  prefix: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  error: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
