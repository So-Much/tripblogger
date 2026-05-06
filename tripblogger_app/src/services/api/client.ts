import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/src/store/auth.store';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
});

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    const refreshToken = useAuthStore.getState().tokens?.refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const response = await axios.post(`${apiBaseUrl}/auth/refresh`, { refreshToken });
      useAuthStore.getState().setTokens(response.data);
      pendingRequests.forEach((cb) => cb(response.data.accessToken));
      pendingRequests = [];
      originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      pendingRequests.forEach((cb) => cb(null));
      pendingRequests = [];
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
