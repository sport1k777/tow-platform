import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type AppMode = 'customer' | 'driver';

export type Session = {
  isAuthenticated: boolean;
  canUseDriverMode: boolean;
  activeMode: AppMode;
};

type SessionContextValue = {
  session: Session;
  signInAsCustomer: () => void;
  signInAsDriverCapable: () => void;
  signOut: () => void;
  switchToDriverMode: () => boolean;
  switchToCustomerMode: () => void;
};

const guestSession: Session = {
  isAuthenticated: false,
  canUseDriverMode: false,
  activeMode: 'customer',
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>(guestSession);

  const signInAsCustomer = useCallback(() => {
    setSession({
      isAuthenticated: true,
      canUseDriverMode: false,
      activeMode: 'customer',
    });
  }, []);

  const signInAsDriverCapable = useCallback(() => {
    setSession({
      isAuthenticated: true,
      canUseDriverMode: true,
      activeMode: 'driver',
    });
  }, []);

  const signOut = useCallback(() => {
    setSession(guestSession);
  }, []);

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
      signInAsCustomer,
      signInAsDriverCapable,
      signOut,
      switchToDriverMode,
      switchToCustomerMode,
    }),
    [
      session,
      signInAsCustomer,
      signInAsDriverCapable,
      signOut,
      switchToDriverMode,
      switchToCustomerMode,
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
