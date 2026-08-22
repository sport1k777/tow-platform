import { Image, StyleSheet, View } from 'react-native';

import { media } from '@/media/assets';
import { colors, space, type } from '@/theme';

import { AppText } from './AppText';

export function BrandLogo({
  size = 48,
  labeled,
}: {
  size?: number;
  labeled?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Image source={media.branding.mark} style={{ width: size, height: size }} />
      {labeled ? (
        <View style={styles.copy}>
          <AppText style={styles.tow}>{copyBrand.tow}</AppText>
          <AppText style={styles.platform}>{copyBrand.platform}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const copyBrand = {
  tow: 'TOW',
  platform: 'PLATFORM',
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.sm,
  },
  copy: {
    alignItems: 'center',
    gap: 2,
  },
  tow: {
    ...type.title,
    color: colors.text,
    letterSpacing: 6,
    fontWeight: '700',
  },
  platform: {
    ...type.status,
    color: colors.secondary,
    letterSpacing: 4,
  },
});
