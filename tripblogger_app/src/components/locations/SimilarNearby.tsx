import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import type { NearbyLocationDto } from '@/src/services/api/locations.service';

type SimilarNearbyProps = {
  items: NearbyLocationDto[];
  onSelect: (item: NearbyLocationDto) => void;
};

export function SimilarNearby({ items, onSelect }: SimilarNearbyProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  if (!items.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <ThemedText style={[styles.title, { color: muted }]}>{t('locationSimilarNearby')}</ThemedText>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item)}
          style={[styles.card, { borderColor: border }]}>
          <ThemedText numberOfLines={1} style={{ fontWeight: '700', fontSize: 13 }}>
            {item.name}
          </ThemedText>
          <ThemedText style={{ color: muted, fontSize: 11 }}>
            {item.distanceKm.toFixed(1)} km
            {(item.avgRating ?? 0) > 0 ? ` · ★${(item.avgRating ?? 0).toFixed(1)}` : ''}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  title: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  card: {
    width: 140,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
});
