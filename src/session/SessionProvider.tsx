import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { ApiError } from '@/api/client';
import { copy } from '@/copy/uk';

import { clearTokens, readActiveMode, readTokens, saveActiveMode, saveTokens } from './tokenStore';

export type AppMode = 'customer' | 'driver';

export type Session = {
  isLoading: boolean;
  isAuthenticated: boolean;
  canUseDriverMode: boolean;
  canUseAdminMode: boolean;
  activeMode: AppMode;
  phone: string | null;
  displayName: string | null;
};

type SessionContextValue = {
  session: Session;
  selectedRole: AppMode | null;
  selectRole: (role: AppMode) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ otpMode?: 'mock'; devCode?: string }>;
  verifyOtp: (phone: string, code: string, role?: AppMode) => Promise<void>;
  signOut: () => Promise<void>;
  switchToDriverMode: () => boolean;
  switchToCustomerMode: () => void;
  getAccessToken: () => string | null;
  authed: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
  refreshProfile: () => Promise<void>;
};

const guestSession: Session = {
  isLoading: true,
  isAuthenticated: false,
  canUseDriverMode: false,
  canUseAdminMode: false,
  activeMode: 'customer',
  phone: null,
  displayName: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function sessionFromMe(me: MeResponse, activeMode: AppMode): Session {
  return {
    isLoading: false,
    isAuthenticated: true,
    canUseDriverMode: me.canUseDriverMode,
    canUseAdminMode: Boolean(me.canUseAdminMode),
    activeMode: me.canUseDriverMode ? activeMode : 'customer',
    phone: me.phone,
    displayName: me.displayName ?? null,
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>(guestSession);
  const [selectedRole, setSelectedRole] = useState<AppMode | null>(null);
  const [tokens, setTokens] = useState<{
    accessToken: string | null;
    refreshToken: string | null;
  }>({ accessToken: null, refreshToken: null });
  const tokensRef = useRef(tokens);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const writeTokens = useCallback(
    (next: { accessToken: string | null; refreshToken: string | null }) => {
      tokensRef.current = next;
      setTokens(next);
    },
    [],
  );

  const applyTokens = useCallback(async (
    accessToken: string,
    refreshToken: string,
    intendedMode: AppMode = 'customer',
  ) => {
    await saveTokens(accessToken, refreshToken);
    const resolvedMode: AppMode = intendedMode === 'driver' ? 'driver' : 'customer';
    await saveActiveMode(resolvedMode);
    setSelectedRole(resolvedMode);
    writeTokens({ accessToken, refreshToken });
    const me = await fetchMe(accessToken);
    setSession(sessionFromMe(me, resolvedMode));
  }, [writeTokens]);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const stored = await readTokens();
        if (!stored.accessToken && !stored.refreshToken) {
          if (!cancelled) {
            setSelectedRole(null);
            setSession({ ...guestSession, isLoading: false });
          }
          return;
        }

        try {
          if (stored.accessToken) {
            const me = await fetchMe(stored.accessToken);
            if (!cancelled) {
              const storedMode = await readActiveMode();
              writeTokens(stored);
              setSelectedRole(storedMode ?? 'customer');
              setSession(sessionFromMe(me, storedMode ?? 'customer'));
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
            const storedMode = await readActiveMode();
            writeTokens({
              accessToken: rotated.accessToken,
              refreshToken: rotated.refreshToken,
            });
            setSelectedRole(storedMode ?? 'customer');
            setSession(sessionFromMe(me, storedMode ?? 'customer'));
          }
        } catch {
          await clearTokens();
          if (!cancelled) {
            writeTokens({ accessToken: null, refreshToken: null });
            setSelectedRole(null);
            setSession({ ...guestSession, isLoading: false });
          }
        }
      } catch {
        if (!cancelled) {
          writeTokens({ accessToken: null, refreshToken: null });
          setSelectedRole(null);
          setSession({ ...guestSession, isLoading: false });
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [writeTokens]);

  const requestOtp = useCallback(async (phone: string) => {
    const result = await requestOtpApi(phone);
    return { otpMode: result.otpMode, devCode: result.devCode };
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string, role: AppMode = 'customer') => {
      const resolved: AppMode = role === 'driver' ? 'driver' : 'customer';
      const result = await verifyOtpApi(phone, code, resolved);
      await applyTokens(result.accessToken, result.refreshToken, resolved);
    },
    [applyTokens],
  );

  const selectRole = useCallback(async (role: AppMode) => {
    const resolved: AppMode = role === 'driver' ? 'driver' : 'customer';
    setSelectedRole(resolved);
    await saveActiveMode(resolved);
  }, []);

  const getAccessToken = useCallback(() => tokens.accessToken, [tokens.accessToken]);

  const signOut = useCallback(async () => {
    const current = tokensRef.current;
    if (current.accessToken && current.refreshToken) {
      try {
        await logoutRequest(current.accessToken, current.refreshToken);
      } catch {
        // still clear local session
      }
    }
    await clearTokens();
    writeTokens({ accessToken: null, refreshToken: null });
    setSelectedRole(null);
    setSession({ ...guestSession, isLoading: false });
  }, [writeTokens]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    refreshInFlight.current = (async () => {
      const refreshToken = tokensRef.current.refreshToken;
      if (!refreshToken) {
        await signOut();
        return null;
      }
      try {
        const rotated = await refreshSession(refreshToken);
        await saveTokens(rotated.accessToken, rotated.refreshToken);
        writeTokens({
          accessToken: rotated.accessToken,
          refreshToken: rotated.refreshToken,
        });
        return rotated.accessToken;
      } catch {
        await signOut();
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, [signOut, writeTokens]);

  const authed = useCallback(
    async <T,>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      const token = tokensRef.current.accessToken;
      if (!token) {
        throw new ApiError(copy.sessionExpired, 401);
      }
      try {
        return await fn(token);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
        const next = await refreshAccessToken();
        if (!next) {
          throw new ApiError(copy.sessionExpired, 401);
        }
        return fn(next);
      }
    },
    [refreshAccessToken],
  );

  const refreshProfile = useCallback(async () => {
    const token = tokensRef.current.accessToken;
    if (!token) {
      return;
    }
    const me = await fetchMe(token);
    setSession((current) => sessionFromMe(me, current.activeMode));
  }, []);

  const switchToDriverMode = useCallback(() => {
    if (!session.canUseDriverMode) {
      return false;
    }
    setSession((current) => ({ ...current, activeMode: 'driver' }));
    setSelectedRole('driver');
    void saveActiveMode('driver');
    return true;
  }, [session.canUseDriverMode]);

  const switchToCustomerMode = useCallback(() => {
    setSession((current) => ({ ...current, activeMode: 'customer' }));
    setSelectedRole('customer');
    void saveActiveMode('customer');
  }, []);

  const value = useMemo(
    () => ({
      session,
      selectedRole,
      selectRole,
      requestOtp,
      verifyOtp,
      signOut,
      switchToDriverMode,
      switchToCustomerMode,
      getAccessToken,
      authed,
      refreshProfile,
    }),
    [
      session,
      selectedRole,
      selectRole,
      requestOtp,
      verifyOtp,
      signOut,
      switchToDriverMode,
      switchToCustomerMode,
      getAccessToken,
      authed,
      refreshProfile,
    ],
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
