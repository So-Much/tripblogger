import { create } from 'zustand';
import { getStoredItem, setStoredItem } from '@/src/platform/stored-item';

export type AppLanguage = 'vi' | 'en';
export type ThemePreference = 'light' | 'dark' | 'system';

const SETTINGS_KEY = 'tripblogger.settings.v1';

interface SettingsState {
  language: AppLanguage;
  themePreference: ThemePreference;
  hydrated: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setThemePreference: (themePreference: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
}

type PersistedSettings = Pick<SettingsState, 'language' | 'themePreference'>;

async function persist(settings: PersistedSettings) {
  await setStoredItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'vi',
  themePreference: 'light',
  hydrated: false,
  setLanguage: async (language) => {
    set({ language });
    await persist({ language, themePreference: get().themePreference });
  },
  setThemePreference: async (themePreference) => {
    set({ themePreference });
    await persist({ language: get().language, themePreference });
  },
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await getStoredItem(SETTINGS_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
      set({
        language: parsed.language === 'en' ? 'en' : 'vi',
        themePreference:
          parsed.themePreference === 'dark' || parsed.themePreference === 'system'
            ? parsed.themePreference
            : 'light',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));

