/**
 * Auth state hook — reads/writes tokens, provides login/logout helpers.
 */
import { useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import type { LoginResponse } from '@contracts/index';

export interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
}

function getStoredToken(): string | null {
  return sessionStorage.getItem('accessToken');
}

export function useAuthState() {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredToken);

  const handleLogin = useCallback(async (pin: string): Promise<LoginResponse> => {
    const res = await apiLogin(pin);
    sessionStorage.setItem('accessToken', res.accessToken);
    sessionStorage.setItem('refreshToken', res.refreshToken);
    setAccessToken(res.accessToken);
    return res;
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setAccessToken(null);
  }, []);

  return {
    accessToken,
    isAuthenticated: accessToken !== null,
    login: handleLogin,
    logout: handleLogout,
  };
}
