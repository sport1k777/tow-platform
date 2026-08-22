import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { copy } from '@/copy/uk';
import { colors, space } from '@/theme';
import { AppText, Button, Screen } from '@/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        footer={
          <View style={styles.footer}>
            <Button label={copy.backHome} onPress={() => router.replace('/')} />
          </View>
        }
      >
        <AppText variant="hero">{copy.unmatchedTitle}</AppText>
        <AppText variant="body" color={colors.secondary} style={styles.body}>
          {copy.unmatchedBody}
        </AppText>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
