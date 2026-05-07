import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/src/services/query-client';
import { ensureSessionId } from '@/src/services/session/session.service';
import { authService } from '@/src/services/api/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { useSettingsStore } from '@/src/store/settings.store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setTokens = useAuthStore((s) => s.setTokens);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionId = await ensureSessionId();
      if (cancelled) return;
      const currentTokens = useAuthStore.getState().tokens;
      if (currentTokens?.accessToken) return;
      try {
        const tokens = await authService.guest({ sessionId });
        if (!cancelled) setTokens(tokens);
      } catch {
        // Keep guest browsing without tokens if server not reachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTokens]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
