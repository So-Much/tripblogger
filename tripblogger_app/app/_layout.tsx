import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import {
  NotoSerifDisplay_400Regular,
  NotoSerifDisplay_600SemiBold,
  useFonts,
} from '@expo-google-fonts/noto-serif-display';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';

import { Colors } from '@/constants/theme';
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
import { postsRealtimeClient } from '@/src/services/realtime/posts-realtime.client';
import { applyCommentCreated, applyPostPatch } from '@/src/services/realtime/posts-realtime.sync';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const navigationLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.cta,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const navigationDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.cta,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    NotoSerifDisplay_400Regular,
    NotoSerifDisplay_600SemiBold,
    SpaceMono_400Regular,
  });
  const setTokens = useAuthStore((s) => s.setTokens);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const accessToken = useAuthStore((s) => s.tokens?.accessToken);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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

      const hydrateMe = async () => {
        try {
          const me = await authService.me();
          if (!cancelled) useAuthStore.getState().setMe(me);
        } catch {
          // me optional until API is up
        }
      };

      if (currentTokens?.refreshToken && deviceId) {
        try {
          const refreshed = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refreshToken: currentTokens.refreshToken,
            deviceId,
          });
          if (!cancelled) {
            useAuthStore.getState().setTokens(refreshed.data);
            await persistAuthTokens(refreshed.data);
            await hydrateMe();
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
          await hydrateMe();
        }
      } catch {
        // Keep guest browsing without tokens if server not reachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTokens]);

  useEffect(() => {
    if (!accessToken) {
      postsRealtimeClient.disconnect();
      return;
    }
    postsRealtimeClient.connect(accessToken);

    const onPostReacted = (payload: unknown) => {
      const p = payload as {
        postId: string;
        reactionCounts: Record<string, number>;
        commentCount: number;
        shareCount: number;
      };
      applyPostPatch(queryClient, {
        postId: p.postId,
        reactionCounts: p.reactionCounts,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
      });
    };

    const onPostShared = (payload: unknown) => {
      const p = payload as { postId: string; reactionCounts: Record<string, number>; shareCount: number };
      applyPostPatch(queryClient, {
        postId: p.postId,
        reactionCounts: p.reactionCounts,
        shareCount: p.shareCount,
      });
    };

    const onCommentCreated = (payload: unknown) => {
      applyCommentCreated(
        queryClient,
        payload as {
          postId: string;
          comment: {
            id: string;
            postId: string;
            displayName: string;
            content: string;
            parentCommentId: string | null;
            createdAt: string;
            updatedAt: string;
          };
          commentCount: number;
        },
      );
    };

    const onReactorsChanged = (payload: unknown) => {
      const p = payload as { postId: string };
      void queryClient.invalidateQueries({ queryKey: ['posts', p.postId, 'reactors'] });
    };

    postsRealtimeClient.on('post.reacted', onPostReacted);
    postsRealtimeClient.on('post.shared', onPostShared);
    postsRealtimeClient.on('comment.created', onCommentCreated);
    postsRealtimeClient.on('post.reactors.changed', onReactorsChanged);

    return () => {
      postsRealtimeClient.off('post.reacted', onPostReacted);
      postsRealtimeClient.off('post.shared', onPostShared);
      postsRealtimeClient.off('comment.created', onCommentCreated);
      postsRealtimeClient.off('post.reactors.changed', onReactorsChanged);
    };
  }, [accessToken]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? navigationDark : navigationLight}>
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
