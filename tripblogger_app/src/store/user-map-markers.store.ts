import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type UserMapMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  createdAt: string;
};

const STORAGE_KEY = 'tripblogger.user-map-markers.v1';

interface UserMapMarkersState {
  markers: UserMapMarker[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  upsert: (input: { id?: string; lat: number; lng: number; name: string }) => UserMapMarker;
  remove: (id: string) => Promise<void>;
}

async function persist(markers: UserMapMarker[]) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(markers));
}

export const useUserMapMarkersStore = create<UserMapMarkersState>((set, get) => ({
  markers: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as UserMapMarker[];
      set({ markers: Array.isArray(parsed) ? parsed : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  reset: async () => {
    set({ markers: [], hydrated: true });
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  },
  upsert: (input) => {
    const trimmed = input.name.trim() || 'Điểm trên bản đồ';
    const existing = input.id ? get().markers.find((m) => m.id === input.id) : undefined;
    const marker: UserMapMarker = {
      id: input.id ?? Crypto.randomUUID(),
      lat: input.lat,
      lng: input.lng,
      name: trimmed,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const next = existing
      ? get().markers.map((m) => (m.id === marker.id ? marker : m))
      : [...get().markers, marker];
    set({ markers: next });
    void persist(next);
    return marker;
  },
  remove: async (id) => {
    const next = get().markers.filter((m) => m.id !== id);
    set({ markers: next });
    await persist(next);
  },
}));

export function userMarkerPinId(markerId: string) {
  return `user-marker:${markerId}`;
}

export function parseUserMarkerPinId(pinId: string): string | null {
  if (!pinId.startsWith('user-marker:')) return null;
  return pinId.slice('user-marker:'.length);
}
