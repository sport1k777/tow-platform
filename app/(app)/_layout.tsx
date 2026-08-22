import { Stack } from 'expo-router';

import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AppLayout() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="customer" />
      <Stack.Protected guard={session.canUseDriverMode}>
        <Stack.Screen name="driver" />
      </Stack.Protected>
      <Stack.Protected guard={session.canUseAdminMode}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}
