import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { useI18n } from '@/src/i18n';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';
import { useMapStore } from '../store/map.store';
import { useRecentSearchesStore } from './recent-searches.store';
import { POI_CATEGORIES, type MapPlace, type PoiCategoryId } from '../types/map';

type Props = {
  onSelectRecent: (place: MapPlace) => void;
};

export function SearchEmptyState({ onSelectRecent }: Props) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const recent = useRecentSearchesStore((s) => s.items);
  const setSelectedCategory = useMapStore((s) => s.setSelectedCategory);
  const setSearchOpen = useMapStore((s) => s.setSearchOpen);

  const pickCategory = (id: PoiCategoryId) => {
    setSelectedCategory(id);
    setSearchOpen(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {POI_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => pickCategory(cat.id)}
            style={[styles.chip, { backgroundColor: surface, borderColor: border }]}>
            <MaterialIcons name={cat.icon} size={16} color={text} />
            <Text style={[styles.chipLabel, { color: text }]}>
              {t(cat.labelKey as 'mapCatRestaurant')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.section, { color: muted }]}>{t('mapRecentSearches')}</Text>
      {recent.map((item) => {
        const visual = resolvePlaceCategoryVisual(item.category);
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelectRecent(item)}
            style={[styles.row, { borderBottomColor: border }]}>
            <LocationTypeIcon
              locationType={{ code: item.category ?? 'other', name: visual.label }}
              size="sm"
            />
            <View style={styles.meta}>
              <Text style={[styles.name, { color: text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.address ? (
                <Text style={[styles.addr, { color: muted }]} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  section: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  addr: { fontSize: 12 },
});
