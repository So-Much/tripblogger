import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaptureTabBarButton } from '@/components/capture-tab-bar-button';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/src/i18n';
import { useClientForm } from '@/src/platform/use-client-form';
import { useAuthStore } from '@/src/store/auth.store';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function WebDesktopTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t } = useI18n();
  const signedIn = Boolean(useAuthStore((s) => s.tokens?.accessToken));
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const hidden =
    (StyleSheet.flatten(focusedOptions?.tabBarStyle) as { display?: string } | undefined)?.display === 'none';
  if (hidden) return null;

  return (
    <View style={[styles.desktopBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
      <Text style={[styles.brand, { color: palette.text }]}>TripBlogger</Text>
      <View style={styles.desktopTabs}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        if ((options as { href?: unknown }).href === null || route.name === 'posts') return null;
        const focused = state.index === index;
        const color = focused ? palette.tint : palette.tabIconDefault;
        const label = options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => navigation.navigate(route.name as never)}
            style={styles.desktopItem}>
            {route.name === 'capture' ? (
              <IconSymbol size={22} name="camera.fill" color={color} />
            ) : (
              options.tabBarIcon?.({ focused, color, size: 22 })
            )}
            <Text style={{ color, fontSize: 14 }}>{label}</Text>
          </Pressable>
        );
      })}
      </View>
      <Pressable
        onPress={() => router.push(signedIn ? '/explore' : '/login')}
        style={[styles.accountBtn, { backgroundColor: palette.cta }]}>
        <Text style={{ color: palette.onCta, fontWeight: '700' }}>{signedIn ? t('tabSettings') : t('login')}</Text>
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const desktop = Platform.OS === 'web' && useClientForm() !== 'phone';

  return (
    <Tabs
      tabBar={desktop ? (props) => <WebDesktopTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        sceneStyle: desktop && route.name !== 'trips' ? { paddingTop: 56 } : undefined,
        // Expo Router / React Navigation pressColor type mismatch (ColorValue vs string).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBarButton: ((props: any) => <HapticTab {...props} />) as never,
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('tabShop'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: t('tabCapture'),
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tabBarButton: ((props: any) => <CaptureTabBarButton {...props} />) as never,
          tabBarIcon: () => <IconSymbol size={28} name="camera.fill" color="#FFFFFF" />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('tabTrips'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="location.fill" color={color} />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          href: null,
          title: t('tabPosts'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopBar: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  desktopTabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  desktopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  accountBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
