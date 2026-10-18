import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { subscribeExpired } from '@/core/auth/auth-events';
import type { LoginRequest, RegisterInput, UserProfile } from '@/domain/auth';
import type { BootstrapResult } from '@/services/auth-service';
import * as authService from '@/services/auth-service';

export type AuthStatus =
  | 'bootstrapping'
  | 'signedOut'
  | 'signedIn'
  | 'retryableError'
  | 'logoutError';

type AuthState = {
  status: AuthStatus;
  profile: UserProfile | null;
};

export type AuthContextValue = AuthState & {
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  retryLogout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'bootstrapping', profile: null });

  const applyBootstrapResult = useCallback((result: BootstrapResult) => {
    if (result.status === 'authenticated') {
      setState({ status: 'signedIn', profile: result.profile });
    } else if (result.status === 'signedOut') {
      setState({ status: 'signedOut', profile: null });
    } else {
      setState({ status: 'retryableError', profile: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    authService
      .bootstrap()
      .then((result) => {
        if (active) {
          applyBootstrapResult(result);
        }
      })
      .catch(() => {
        if (active) {
          applyBootstrapResult({ status: 'retryableError' });
        }
      });
    return () => {
      active = false;
    };
  }, [applyBootstrapResult]);

  useEffect(
    () =>
      subscribeExpired(() => {
        setState({ status: 'signedOut', profile: null });
      }),
    []
  );

  const login = useCallback(async (input: LoginRequest) => {
    const profile = await authService.login(input);
    setState({ status: 'signedIn', profile });
  }, []);

  const register = useCallback((input: RegisterInput) => authService.register(input), []);

  const performLogout = useCallback(async () => {
    try {
      await authService.logout();
      setState({ status: 'signedOut', profile: null });
    } catch {
      setState({ status: 'logoutError', profile: null });
    }
  }, []);

  const retryBootstrap = useCallback(async () => {
    setState({ status: 'bootstrapping', profile: null });
    const result = await authService.bootstrap();
    applyBootstrapResult(result);
  }, [applyBootstrapResult]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout: performLogout,
      retryBootstrap,
      retryLogout: performLogout,
    }),
    [state, login, register, performLogout, retryBootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}
