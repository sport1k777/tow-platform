import { Redirect } from 'expo-router';

import { useSession } from '@/session';

export default function Index() {
  const { session } = useSession();

  if (session.isLoading) {
    return null;
  }

  if (!session.isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  if (session.activeMode === 'driver' && session.canUseDriverMode) {
    return <Redirect href="/driver" />;
  }

  return <Redirect href="/customer" />;
}
