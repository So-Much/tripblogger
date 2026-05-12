import * as SecureStore from 'expo-secure-store';import { useAuthStore } from '@/src/store/auth.store';

const SESSION_ID_KEY = 'tripblogger.sessionId';
const DEVICE_ID_KEY = 'tripblogger.deviceId';
const ACCESS_TOKEN_KEY = 'tripblogger.accessToken';
const REFRESH_TOKEN_KEY = 'tripblogger.refreshToken';

function uuidLike(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function ensureSessionId(): Promise<string> {
  const inStore = useAuthStore.getState().sessionId;
  if (inStore) return inStore;

  const existing = await SecureStore.getItemAsync(SESSION_ID_KEY);
  if (existing) {
    useAuthStore.getState().setSessionId(existing);
    return existing;
  }

  const created = uuidLike();
  await SecureStore.setItemAsync(SESSION_ID_KEY, created);
  useAuthStore.getState().setSessionId(created);
  return created;
}

export async function ensureDeviceId(): Promise<string> {
  const inStore = useAuthStore.getState().deviceId;
  if (inStore) return inStore;

  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    useAuthStore.getState().setDeviceId(existing);
    return existing;
  }

  const created = uuidLike();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
  useAuthStore.getState().setDeviceId(created);
  return created;
}

export async function persistAuthTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function hydrateAuthTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearPersistedAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

