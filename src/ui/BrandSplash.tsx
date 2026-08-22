import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { BrandLogo } from './BrandLogo';

export function BrandSplash() {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.96));
  const [line] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      Animated.timing(line, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [line, opacity, scale]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <BrandLogo size={96} labeled />
        <Animated.View
          style={[
            styles.line,
            {
              transform: [{ scaleX: line }],
            },
          ]}
        />
        <AppText variant="caption" color={colors.secondary} style={styles.tagline}>
          {copy.splashTagline}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: space.xl,
  },
  tagline: {
    marginTop: space.lg,
    textAlign: 'center',
  },
});
