import { apiClient } from './client';
import { AuthTokens, MeResponse } from '@/src/types/auth';

export interface RegisterPayload {
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/register', payload);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/login', payload);
    return response.data;
  },

  async guest(payload: { sessionId: string }): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/guest', payload);
    return response.data;
  },

  async google(payload: { idToken: string }): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/google', payload);
    return response.data;
  },

  async me(): Promise<MeResponse> {
    const response = await apiClient.get<MeResponse>('/auth/me');
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
