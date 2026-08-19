import { apiClient } from '@/src/services/api/client';
import { queryClient } from '@/src/services/query-client';
import { useAuthStore } from '@/src/store/auth.store';
import { usePostComposerHandoffStore } from '@/src/store/post-composer-handoff.store';
import type { AuthTokens, MeResponse } from '@/src/types/auth';
import {
  clearPersistedAuthTokens,
  ensureDeviceId,
  ensureSessionId,
  persistAuthTokens,
} from '@/src/services/session/session.service';

/** Clear TanStack Query cache and non-auth Zustand slices tied to the previous session. */
export function resetAppSessionStores() {
  queryClient.clear();
  usePostComposerHandoffStore.getState().setPending([]);
  usePostComposerHandoffStore.getState().setReturnPostId(null);
}

/**
 * Issue a fresh guest token pair and hydrate `/auth/me`.
 * Uses `apiClient` directly (not `authService`) to avoid the require cycle:
 * auth.service → client → session-bootstrap → auth.service
 */
export async function bootstrapGuestSession(): Promise<void> {
  const sessionId = await ensureSessionId();
  const deviceId = await ensureDeviceId();
  try {
    const tokensRes = await apiClient.post<AuthTokens>('/auth/guest', {
      sessionId,
      deviceId,
    });
    const tokens = tokensRes.data;
    useAuthStore.getState().setTokens(tokens);
    await persistAuthTokens(tokens);
    try {
      const meRes = await apiClient.get<MeResponse>('/auth/me');
      useAuthStore.getState().setMe(meRes.data);
    } catch {
      useAuthStore.getState().setMe(null);
    }
  } catch {
    useAuthStore.getState().setTokens(null);
    useAuthStore.getState().setMe(null);
  }
}

/** Log out member session, clear caches, and re-establish guest browsing. */
export async function logoutAndReGuest(): Promise<void> {
  useAuthStore.getState().logout();
  await clearPersistedAuthTokens();
  resetAppSessionStores();
  await bootstrapGuestSession();
}

/** After guest→member (or member switch), drop stale cached data from the prior session. */
export function clearSessionQueryCache() {
  queryClient.clear();
}
