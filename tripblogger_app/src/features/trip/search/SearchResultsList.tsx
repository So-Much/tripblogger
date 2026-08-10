import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { useI18n } from '@/src/i18n';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';
import { PlaceRatingLabel } from '../components/PlaceRatingLabel';
import { useMapStore } from '../store/map.store';
import { useRecentSearchesStore } from './recent-searches.store';
import type { MapPlace } from '../types/map';
import { formatDistance } from '../utils/geo';
import { formatResultSubline } from '../utils/search-result-format';

type Props = {
  onSelect: (place: MapPlace) => void;
  loading?: boolean;
  error?: boolean;
};

export function SearchResultsList({ onSelect, loading, error }: Props) {
  const { t, language } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const tint = useThemeColor({}, 'tint');
  const results = useMapStore((s) => s.searchResults);
  const query = useMapStore((s) => s.searchQuery);
  const recent = useRecentSearchesStore((s) => s.items);
  const searching = query.trim().length >= 2;
  const data = searching ? results : recent;
  const emptyLabel = searching
    ? error
      ? t('mapSearchError')
      : t('mapSearchEmpty')
    : t('mapRecentSearches');

  return (
    <View style={[styles.root, { backgroundColor: surface }]}>
      {searching && loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tint} />
          <Text style={[styles.loadingText, { color: muted }]}>{t('mapLoadingSearch')}</Text>
        </View>
      ) : null}
      {!searching ? (
        <Text style={[styles.section, { color: muted }]}>{t('mapRecentSearches')}</Text>
      ) : null}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          searching && loading ? null : (
            <Text style={[styles.empty, { color: muted }]}>{emptyLabel}</Text>
          )
        }
        renderItem={({ item }) => {
          const categoryVisual = resolvePlaceCategoryVisual(item.category);
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.row, { borderBottomColor: border }]}>
              <LocationTypeIcon
                locationType={{ code: item.category ?? 'other', name: categoryVisual.label }}
                size="sm"
              />
              <View style={styles.meta}>
                <Text style={[styles.name, { color: text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.addr, { color: muted }]} numberOfLines={1}>
                  {formatResultSubline({
                    category: categoryVisual.label,
                    address: item.address,
                    distanceLabel:
                      item.distanceM != null ? formatDistance(item.distanceM, language) : null,
                  })}
                </Text>
                <PlaceRatingLabel rating={item.rating} reviewCount={item.reviewCount} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },
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
  empty: { padding: 24, textAlign: 'center' },
});
