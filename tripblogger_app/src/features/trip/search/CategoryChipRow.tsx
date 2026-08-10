import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useMapStore } from '../store/map.store';
import { POI_CATEGORIES, type PoiCategoryId } from '../types/map';

type Props = {
  loading?: boolean;
};

/** After place sheet hide — let Reanimated/layout settle before category fetch. */
const CATEGORY_AFTER_PLACE_CLOSE_MS = 64;

export function CategoryChipRow({ loading }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const onCta = useThemeColor({}, 'onCta');
  const selected = useMapStore((s) => s.selectedCategory);
  const setSelectedCategory = useMapStore((s) => s.setSelectedCategory);
  const pendingCategoryRef = useRef<PoiCategoryId | null | undefined>(undefined);

  const toggle = (id: PoiCategoryId) => {
    const next: PoiCategoryId | null = selected === id ? null : id;
    pendingCategoryRef.current = next;

    // Crash-proof: close place/directions FIRST, then change category after the
    // sheet tree has settled. Same-frame overlay hide + nearbyEpoch + marker
    // churn was still killing react-native-maps after the prior abort-only fix.
    const closed = useMapStore.getState().closeOverlayForCategoryChange();
    if (closed) {
      const requested = next;
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          if (pendingCategoryRef.current !== requested) return;
          pendingCategoryRef.current = undefined;
          useMapStore.getState().setSelectedCategory(requested);
        }, CATEGORY_AFTER_PLACE_CLOSE_MS);
      });
      return;
    }

    pendingCategoryRef.current = undefined;
    setSelectedCategory(next);
  };

  return (
    <View style={[styles.wrap, { top: insets.top + 62 }]} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {POI_CATEGORIES.map((cat) => {
          const active = selected === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => toggle(cat.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? tint : surface,
                  borderColor: active ? tint : border,
                },
              ]}>
              {active && loading ? (
                <ActivityIndicator size="small" color={onCta} />
              ) : (
                <MaterialIcons name={cat.icon} size={16} color={active ? onCta : text} />
              )}
              <Text style={[styles.label, { color: active ? onCta : text }]}>
                {t(cat.labelKey as 'mapCatRestaurant')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 19,
  },
  row: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
