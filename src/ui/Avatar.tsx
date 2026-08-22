import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { colors, type } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

function initialsFromName(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function Avatar({
  uri,
  headers,
  name,
  size = 56,
  loading = false,
}: {
  uri?: string | null;
  headers?: Record<string, string>;
  name?: string | null;
  size?: number;
  loading?: boolean;
}) {
  const initials = initialsFromName(name);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = Boolean(uri) && failedUri === uri;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri && !failed ? (
        <Image
          source={{ uri, headers }}
          onError={() => setFailedUri(uri)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : initials ? (
        <AppText style={[styles.initials, { fontSize: Math.round(size * 0.34) }]}>
          {initials}
        </AppText>
      ) : (
        <Icon name="user" size={Math.round(size * 0.46)} color={colors.secondary} />
      )}
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8, 11, 15, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...type.label,
    color: colors.text,
  },
});
