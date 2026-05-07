import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/src/store/settings.store';

export function useColorScheme() {
  const system = useRNColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);

  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return system ?? 'light';
}
