import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(main)" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
