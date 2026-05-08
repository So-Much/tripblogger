import { create } from 'zustand';
import { AuthTokens, MeResponse } from '@/src/types/auth';

interface AuthState {
  tokens: AuthTokens | null;
  me: MeResponse | null;
  sessionId: string | null;
  deviceId: string | null;
  setTokens: (tokens: AuthTokens | null) => void;
  setMe: (me: MeResponse | null) => void;
  setSessionId: (sessionId: string | null) => void;
  setDeviceId: (deviceId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  tokens: null,
  me: null,
  sessionId: null,
  deviceId: null,
  setTokens: (tokens) => set({ tokens }),
  setMe: (me) => set({ me }),
  setSessionId: (sessionId) => set({ sessionId }),
  setDeviceId: (deviceId) => set({ deviceId }),
  logout: () => set({ tokens: null, me: null }),
}));
