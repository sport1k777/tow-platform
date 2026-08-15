import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  fetchMe,
  logoutRequest,
  refreshSession,
  requestOtp as requestOtpApi,
  verifyOtp as verifyOtpApi,
  type MeResponse,
} from '@/api/auth';

import { clearTokens, readTokens, saveTokens } from './tokenStore';

export type AppMode = 'customer' | 'driver';

export type Session = {
  isLoading: boolean;
  isAuthenticated: boolean;
  canUseDriverMode: boolean;
  activeMode: AppMode;
  phone: string | null;
};

type SessionContextValue = {
  session: Session;
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchToDriverMode: () => boolean;
  switchToCustomerMode: () => void;
};

const guestSession: Session = {
  isLoading: true,
  isAuthenticated: false,
  canUseDriverMode: false,
  activeMode: 'customer',
  phone: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function sessionFromMe(me: MeResponse, activeMode: AppMode): Session {
  return {
    isLoading: false,
    isAuthenticated: true,
    canUseDriverMode: me.canUseDriverMode,
    activeMode: me.canUseDriverMode ? activeMode : 'customer',
    phone: me.phone,
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>(guestSession);
  const [tokens, setTokens] = useState<{
    accessToken: string | null;
    refreshToken: string | null;
  }>({ accessToken: null, refreshToken: null });

  const applyTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    await saveTokens(accessToken, refreshToken);
    setTokens({ accessToken, refreshToken });
    const me = await fetchMe(accessToken);
    setSession(sessionFromMe(me, 'customer'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = await readTokens();
      if (!stored.accessToken && !stored.refreshToken) {
        if (!cancelled) {
          setSession({ ...guestSession, isLoading: false });
        }
        return;
      }

      try {
        if (stored.accessToken) {
          const me = await fetchMe(stored.accessToken);
          if (!cancelled) {
            setTokens(stored);
            setSession(sessionFromMe(me, 'customer'));
          }
          return;
        }
      } catch {
        // try refresh below
      }

      try {
        if (!stored.refreshToken) {
          throw new Error('No refresh token');
        }
        const rotated = await refreshSession(stored.refreshToken);
        if (cancelled) {
          return;
        }
        await saveTokens(rotated.accessToken, rotated.refreshToken);
        const me = await fetchMe(rotated.accessToken);
        if (!cancelled) {
          setTokens({
            accessToken: rotated.accessToken,
            refreshToken: rotated.refreshToken,
          });
          setSession(sessionFromMe(me, 'customer'));
        }
      } catch {
        await clearTokens();
        if (!cancelled) {
          setTokens({ accessToken: null, refreshToken: null });
          setSession({ ...guestSession, isLoading: false });
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    const result = await requestOtpApi(phone);
    return { devCode: result.devCode };
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      const result = await verifyOtpApi(phone, code);
      await applyTokens(result.accessToken, result.refreshToken);
    },
    [applyTokens],
  );

  const signOut = useCallback(async () => {
    if (tokens.accessToken && tokens.refreshToken) {
      try {
        await logoutRequest(tokens.accessToken, tokens.refreshToken);
      } catch {
        // still clear local session
      }
    }
    await clearTokens();
    setTokens({ accessToken: null, refreshToken: null });
    setSession({ ...guestSession, isLoading: false });
  }, [tokens]);

  const switchToDriverMode = useCallback(() => {
    if (!session.canUseDriverMode) {
      return false;
    }
    setSession((current) => ({ ...current, activeMode: 'driver' }));
    return true;
  }, [session.canUseDriverMode]);

  const switchToCustomerMode = useCallback(() => {
    setSession((current) => ({ ...current, activeMode: 'customer' }));
  }, []);

  const value = useMemo(
    () => ({
      session,
      requestOtp,
      verifyOtp,
      signOut,
      switchToDriverMode,
      switchToCustomerMode,
    }),
    [session, requestOtp, verifyOtp, signOut, switchToDriverMode, switchToCustomerMode],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
