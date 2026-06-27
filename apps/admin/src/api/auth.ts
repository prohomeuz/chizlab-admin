/**
 * Auth API calls — login, refresh, logout.
 */
import { apiClient } from './client';
import type { LoginRequest, LoginResponse, RefreshResponse } from '@contracts/index';

export async function login(pin: string): Promise<LoginResponse> {
  const body: LoginRequest = { pin };
  const res = await apiClient.post<LoginResponse>('/api/admin/auth/login', body);
  return res.data;
}

export async function refreshToken(token: string): Promise<RefreshResponse> {
  const res = await apiClient.post<RefreshResponse>('/api/admin/auth/refresh', {
    refreshToken: token,
  });
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/admin/auth/logout');
  } catch {
    // ignore errors on logout
  } finally {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }
}
