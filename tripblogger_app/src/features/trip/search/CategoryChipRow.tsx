import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useMapStore } from '../store/map.store';
import { POI_CATEGORIES, type PoiCategoryId } from '../types/map';

type Props = {
  loading?: boolean;
};

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

  const toggle = (id: PoiCategoryId) => {
    setSelectedCategory(selected === id ? null : id);
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
