import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useClientBehavior } from '@/src/platform/use-client-behavior';
import { PLAN_NAV_BAR_OFFSET } from '../plan/plan-sheet-layout';
import { useMapStore } from '../store/map.store';
import { usePlanStore } from '../store/plan.store';
import type { TripBottomTab } from '../types/map';

type Props = {
  onExplorePress: () => void;
};

const TABS: {
  id: TripBottomTab;
  icon: keyof typeof MaterialIcons.glyphMap;
  labelKey: string;
  placeholder?: boolean;
}[] = [
  { id: 'explore', icon: 'explore', labelKey: 'mapTabExplore' },
  { id: 'plan', icon: 'event-note', labelKey: 'mapTabPlan' },
  { id: 'contribute', icon: 'add-location-alt', labelKey: 'mapTabContribute', placeholder: true },
];

export function TripBottomNav({ onExplorePress }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const pointer = !useClientBehavior().dragSheets;
  const bottomTab = useMapStore((s) => s.bottomTab);
  const setBottomTab = useMapStore((s) => s.setBottomTab);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);

  return (
    <View
      style={[
        pointer ? [styles.barDock, { top: insets.top + 10 }] : styles.bar,
        pointer
          ? { backgroundColor: surface, borderColor: border }
          : {
              backgroundColor: surface,
              borderTopColor: border,
              minHeight: PLAN_NAV_BAR_OFFSET + Math.max(insets.bottom, 8),
              paddingBottom: Math.max(insets.bottom, 8),
            },
      ]}>
      {TABS.map((tab) => {
        const active = bottomTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={pointer ? styles.itemDock : styles.item}
            onPress={() => {
              setBottomTab(tab.id);
              if (tab.id === 'explore') {
                setActiveSheet('explore');
                onExplorePress();
              } else if (tab.id === 'plan') {
                setActiveSheet('none');
                useMapStore.getState().setSearchOpen(false);
                // Explore-style: dismissed sheet reopens from the tab press.
                usePlanStore.getState().revealPlanSheet();
              }
            }}>
            <MaterialIcons name={tab.icon} size={pointer ? 20 : 24} color={active ? tint : muted} />
            <Text style={[styles.label, { color: active ? tint : muted }]}>
              {t(tab.labelKey as 'mapTabExplore' | 'mapTabPlan' | 'mapTabContribute')}
            </Text>
            {tab.placeholder && active ? (
              <Text style={[styles.soon, { color: text }]}>{t('mapComingSoon')}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    zIndex: 40,
  },
  barDock: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 6,
    zIndex: 40,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  itemDock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  soon: {
    fontSize: 9,
    opacity: 0.6,
  },
});
