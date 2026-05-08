import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/src/services/query-client';
import {
  clearPersistedAuthTokens,
  ensureDeviceId,
  ensureSessionId,
  hydrateAuthTokens,
  persistAuthTokens,
} from '@/src/services/session/session.service';
import { authService } from '@/src/services/api/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { useSettingsStore } from '@/src/store/settings.store';
import { apiBaseUrl } from '@/src/services/api/client';
import axios from 'axios';

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
      const deviceId = await ensureDeviceId();
      if (cancelled) return;
      const currentTokens = useAuthStore.getState().tokens ?? (await hydrateAuthTokens());
      if (currentTokens) {
        useAuthStore.getState().setTokens(currentTokens);
      }

      if (currentTokens?.refreshToken && deviceId) {
        try {
          const refreshed = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refreshToken: currentTokens.refreshToken,
            deviceId,
          });
          if (!cancelled) {
            useAuthStore.getState().setTokens(refreshed.data);
            await persistAuthTokens(refreshed.data);
            return;
          }
        } catch {
          useAuthStore.getState().logout();
          await clearPersistedAuthTokens();
        }
      }

      try {
        const tokens = await authService.guest({ sessionId, deviceId });
        if (!cancelled) {
          setTokens(tokens);
          await persistAuthTokens(tokens);
        }
      } catch {
        // Keep guest browsing without tokens if server not reachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTokens]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
