import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * When screens are opened from Settings (`?from=settings`), always return to
 * the Settings tab — stack history may point at shop/trips index instead.
 */
export function WithSettingsOriginBack({ children }: { children: ReactNode }) {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');

  const backToSettings = () => router.replace('/(tabs)/explore');

  return (
    <>
      {from === 'settings' ? (
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={12}
                onPress={backToSettings}
                style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                <IconSymbol name="chevron.left" color={tint} size={24} />
              </Pressable>
            ),
          }}
        />
      ) : null}
      {children}
    </>
  );
}
