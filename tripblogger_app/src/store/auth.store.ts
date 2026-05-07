import { create } from 'zustand';
import { AuthTokens, MeResponse } from '@/src/types/auth';

interface AuthState {
  tokens: AuthTokens | null;
  me: MeResponse | null;
  sessionId: string | null;
  setTokens: (tokens: AuthTokens | null) => void;
  setMe: (me: MeResponse | null) => void;
  setSessionId: (sessionId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  tokens: null,
  me: null,
  sessionId: null,
  setTokens: (tokens) => set({ tokens }),
  setMe: (me) => set({ me }),
  setSessionId: (sessionId) => set({ sessionId }),
  logout: () => set({ tokens: null, me: null }),
}));
