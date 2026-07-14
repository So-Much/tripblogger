import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripRecommendationDto } from '@/src/types/trip';

type TripRecommendationsPanelProps = {
  items: TripRecommendationDto[];
  loading: boolean;
  onAdd?: (item: TripRecommendationDto) => void;
  onDismiss?: (item: TripRecommendationDto) => void;
};

export function TripRecommendationsPanel({ items, loading, onAdd, onDismiss }: TripRecommendationsPanelProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  if (loading) {
    return (
      <View style={[styles.panel, { borderColor: border, backgroundColor: card }]}>
        <ActivityIndicator color={tint} />
        <ThemedText style={{ color: muted, textAlign: 'center' }}>{t('tripRecsLoading')}</ThemedText>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.panel, { borderColor: border, backgroundColor: card }]}>
        <IconSymbol name="star.fill" size={22} color={muted} />
        <ThemedText style={{ color: muted, textAlign: 'center' }}>
          {t('tripRecsEmpty')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: border, backgroundColor: card }]}>
      {items.map((r, index) => (
        <View
          key={r.id}
          style={[styles.item, index < items.length - 1 ? { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth } : undefined]}>
          <View style={styles.itemBody}>
            <LocationNameLabel
              name={r.location.name}
              locationType={r.location.locationType}
              variant="list"
              subtitle={`${r.distanceKm != null ? `${r.distanceKm.toFixed(1)} km · ` : ''}${t('tripRecFitScore', { percent: (r.score * 100).toFixed(0) })}`}
            />
          </View>
          {r.isAdded ? (
            <ThemedText style={{ color: tint, fontSize: 11, fontWeight: '700' }}>{t('tripAddedStop')}</ThemedText>
          ) : (
            <View style={styles.actionRow}>
              <Pressable onPress={() => onAdd?.(r)}>
                <ThemedText style={{ color: tint, fontWeight: '700', fontSize: 12 }}>Them</ThemedText>
              </Pressable>
              <Pressable onPress={() => onDismiss?.(r)}>
                <ThemedText style={{ color: '#c62828', fontWeight: '700', fontSize: 12 }}>Bo qua</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  itemBody: { flex: 1, minWidth: 0 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
