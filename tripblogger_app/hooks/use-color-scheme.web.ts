import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/src/store/settings.store';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const pref = useSettingsStore((s) => s.themePreference);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
