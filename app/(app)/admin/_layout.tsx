import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="drivers" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="driver/[id]" />
    </Stack>
  );
}
