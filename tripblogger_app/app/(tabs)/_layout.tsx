import { Tabs } from 'expo-router';
import React from 'react';

import { CaptureTabBarButton } from '@/components/capture-tab-bar-button';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/src/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        // Expo Router / React Navigation pressColor type mismatch (ColorValue vs string).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBarButton: ((props: any) => <HapticTab {...props} />) as never,
      }}>
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
