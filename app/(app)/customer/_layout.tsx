import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(main)" />
      <Stack.Screen name="intake" />
      <Stack.Screen name="map" />
      <Stack.Screen name="details" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
