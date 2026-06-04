import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiRequest,
  bootstrapSession,
  clearSession,
  getSession,
  logoutSession,
  setAuthenticatedSession,
  subscribeSession
} from '../api';
import type { AuthState, AuthUser } from './types';

type LoginContextValue = AuthState & {
  beginMemberLogin: () => Promise<void>;
  beginAdminLogin: (email: string, password: string) => Promise<{
    two_factor_required: boolean;
    challenge_id?: string;
    access_token?: string;
    user?: AuthUser;
  }>;
  verifyAdminCode: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<LoginContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(getSession());

  useEffect(() => {
    const unsubscribe = subscribeSession(setState);
    void bootstrapSession();
    return unsubscribe;
  }, []);

  const beginMemberLogin = async () => {
    const start = await apiRequest<{ auth_url: string }>('/api/v1/auth/google/start', {
      method: 'GET'
    }, { skipAuth: true, allowRetry: false });
    window.location.assign(start.auth_url);
  };

  const beginAdminLogin = async (email: string, password: string) => {
    const result = await apiRequest<{
      two_factor_required: boolean;
      challenge_id?: string;
      access_token?: string;
      user?: AuthUser;
    }>(
      '/api/v1/auth/admin/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password })
      },
      { skipAuth: true, allowRetry: false }
    );
    
    if (!result.two_factor_required && result.access_token && result.user) {
      setAuthenticatedSession(result.access_token, result.user);
    }
    
    return result;
  };

  const verifyAdminCode = async (challengeId: string, code: string) => {
    const session = await apiRequest<{ access_token: string; user: AuthUser }>(
      '/api/v1/auth/admin/2fa/verify',
      {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId, code })
      },
      { skipAuth: true, allowRetry: false }
    );
    setAuthenticatedSession(session.access_token, session.user);
    navigate('/admin/dashboard');
  };

  const logout = async () => {
    await logoutSession();
    clearSession();
    navigate('/');
  };

  const value = useMemo<LoginContextValue>(
    () => ({
      ...state,
      beginMemberLogin,
      beginAdminLogin,
      verifyAdminCode,
      logout
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
