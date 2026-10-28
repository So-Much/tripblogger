import { useAuthStore } from '@/src/store/auth.store';
import { deleteStoredItem, getStoredItem, setStoredItem } from '@/src/platform/stored-item';

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

  const existing = await getStoredItem(SESSION_ID_KEY);
  if (existing) {
    useAuthStore.getState().setSessionId(existing);
    return existing;
  }

  const created = uuidLike();
  await setStoredItem(SESSION_ID_KEY, created);
  useAuthStore.getState().setSessionId(created);
  return created;
}

export async function ensureDeviceId(): Promise<string> {
  const inStore = useAuthStore.getState().deviceId;
  if (inStore) return inStore;

  const existing = await getStoredItem(DEVICE_ID_KEY);
  if (existing) {
    useAuthStore.getState().setDeviceId(existing);
    return existing;
  }

  const created = uuidLike();
  await setStoredItem(DEVICE_ID_KEY, created);
  useAuthStore.getState().setDeviceId(created);
  return created;
}

export async function persistAuthTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  await setStoredItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  await setStoredItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function hydrateAuthTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getStoredItem(ACCESS_TOKEN_KEY),
    getStoredItem(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearPersistedAuthTokens(): Promise<void> {
  await Promise.all([
    deleteStoredItem(ACCESS_TOKEN_KEY),
    deleteStoredItem(REFRESH_TOKEN_KEY),
  ]);
}

