import { apiClient } from './client';
import { AuthTokens, MeResponse } from '@/src/types/auth';

export interface RegisterPayload {
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  avatarUrl?: string;
  deviceId: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  deviceId: string;
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

  async guest(payload: { sessionId: string; deviceId: string }): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/guest', payload);
    return response.data;
  },

  async google(payload: { idToken: string; deviceId: string }): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/google', payload);
    return response.data;
  },

  async me(): Promise<MeResponse> {
    const response = await apiClient.get<MeResponse>('/auth/me');
    return response.data;
  },

  async logout(payload: { refreshToken: string; deviceId: string }): Promise<void> {
    await apiClient.post('/auth/logout', payload);
  },

  async getMemberStats(): Promise<{ postsCount: number; productsCount: number }> {
    const response = await apiClient.get<{ postsCount: number; productsCount: number }>('/users/me/stats');
    return response.data;
  },

  async updateProfile(payload: {
    displayName?: string;
    email?: string;
    removeAvatar?: boolean;
    avatarFile?: { uri: string; name: string; type: string };
    totalTravelBudgetAmount?: number | null;
    totalTravelBudgetCurrency?: string | null;
  }): Promise<MeResponse> {
    const body = new FormData();
    if (payload.displayName !== undefined) {
      body.append('displayName', payload.displayName);
    }
    if (payload.email !== undefined) {
      body.append('email', payload.email);
    }
    if (payload.removeAvatar) {
      body.append('removeAvatar', 'true');
    }
    if (payload.avatarFile) {
      body.append('avatar', payload.avatarFile as unknown as Blob);
    }
    if (payload.totalTravelBudgetAmount !== undefined) {
      body.append(
        'totalTravelBudgetAmount',
        payload.totalTravelBudgetAmount == null ? '' : String(payload.totalTravelBudgetAmount),
      );
    }
    if (payload.totalTravelBudgetCurrency !== undefined) {
      body.append('totalTravelBudgetCurrency', payload.totalTravelBudgetCurrency ?? '');
    }
    const response = await apiClient.patch<MeResponse>('/users/me/profile', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
