import { PlatformPressable } from 'expo-router/react-navigation';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

type TabBarButtonProps = ComponentProps<typeof PlatformPressable> & {
  children?: ReactNode;
};

/**
 * Center FAB for capture. Does not render `props.children` so the default tab label
 * Text is never shown (tabBarShowLabel alone still injects children on some versions).
 */
export function CaptureTabBarButton(props: TabBarButtonProps) {
  const { t } = useI18n();
  const cta = useThemeColor({}, 'cta');
  const { children: _children, style, ...pressableRest } = props;

  return (
    <PlatformPressable
      {...pressableRest}
      accessibilityRole="button"
      accessibilityLabel={t('tabCapture')}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        props.onPressIn?.(ev);
      }}
      style={[style, styles.outer]}>
      <View style={[styles.fab, { backgroundColor: cta }]}>
        <IconSymbol name="camera.fill" size={26} color="#FFFFFF" />
      </View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 8,
  },
});
