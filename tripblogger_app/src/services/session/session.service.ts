import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/src/store/auth.store';

const SESSION_ID_KEY = 'tripblogger.sessionId';

function uuidLike() {
  // Expo Crypto gives us random bytes; format to UUID-ish string
  const hex = Crypto.getRandomBytes(16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

