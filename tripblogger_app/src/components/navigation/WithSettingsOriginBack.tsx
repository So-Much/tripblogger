import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * When shop screens are opened from Settings (`?from=settings`), the shop stack
 * may have no history — inject a header back control that returns to Settings.
 */
export function WithSettingsOriginBack({ children }: { children: ReactNode }) {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const tint = useThemeColor({}, 'tint');

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
                onPress={() => {
                  if (navigation.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/explore');
                  }
                }}
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
