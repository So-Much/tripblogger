import { create } from 'zustand';
import { AuthTokens, MeResponse } from '@/src/types/auth';

interface AuthState {
  tokens: AuthTokens | null;
  me: MeResponse | null;
  setTokens: (tokens: AuthTokens | null) => void;
  setMe: (me: MeResponse | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  tokens: null,
  me: null,
  setTokens: (tokens) => set({ tokens }),
  setMe: (me) => set({ me }),
  logout: () => set({ tokens: null, me: null }),
}));
