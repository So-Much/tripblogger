import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { MapPlace } from '../types/map';

const KEY = 'tripblogger.map.recentSearches';
const MAX = 8;

type RecentState = {
  items: MapPlace[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (place: MapPlace) => void;
  clear: () => void;
};

async function persist(items: MapPlace[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const useRecentSearchesStore = create<RecentState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const items = raw ? (JSON.parse(raw) as MapPlace[]) : [];
      set({ items: Array.isArray(items) ? items.slice(0, MAX) : [], hydrated: true });
    } catch {
      set({ items: [], hydrated: true });
    }
  },
  add: (place) => {
    const next = [place, ...get().items.filter((p) => p.id !== place.id)].slice(0, MAX);
    set({ items: next });
    void persist(next);
  },
  clear: () => {
    set({ items: [] });
    void persist([]);
  },
}));
