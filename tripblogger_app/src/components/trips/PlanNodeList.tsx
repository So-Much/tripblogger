import { Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapRouteStop } from '@/src/types/trip-map';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';

type PlanNodeListProps = {
  stops: MapRouteStop[];
  selectedStopId?: string | null;
  onSelectStop: (stop: MapRouteStop) => void;
  onRemoveStop: (stop: MapRouteStop) => void;
  onReorder: (stops: { id: string; orderIndex: number }[]) => void;
};

export function PlanNodeList({
  stops,
  selectedStopId,
  onSelectStop,
  onRemoveStop,
  onReorder,
}: PlanNodeListProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <DraggableFlatList
      data={stops}
      keyExtractor={(item) => item.id}
      style={{ maxHeight: 220 }}
      contentContainerStyle={{ gap: 8 }}
      onDragBegin={() => {
        void Haptics.selectionAsync();
      }}
      onDragEnd={({ data }) => {
        const ordered = data.map((item, index) => ({ id: item.id, orderIndex: index }));
        onReorder(ordered);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
      renderItem={({ item, drag, isActive, getIndex }) => {
        const index = getIndex() ?? 0;
        const selected = selectedStopId === item.id;
        return (
          <ScaleDecorator>
            <Pressable
              onPress={() => onSelectStop(item)}
              onLongPress={drag}
              delayLongPress={150}
              style={[
                styles.row,
                {
                  borderColor: selected ? tint : border,
                  backgroundColor: selected ? `${tint}10` : 'transparent',
                  opacity: isActive ? 0.9 : 1,
                },
              ]}>
              <View style={styles.head}>
                <View style={styles.titleWrap}>
                  <ThemedText style={[styles.seq, { color: muted }]}>#{index + 1}</ThemedText>
                  <LocationTypeIcon locationType={item.locationType ?? undefined} size="sm" selected={selected} />
                  <ThemedText numberOfLines={1} style={styles.name}>
                    {item.name}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.status, { color: muted }]}>{item.status}</ThemedText>
              </View>
              <View style={styles.actions}>
                <ThemedText style={{ color: muted, fontSize: 12 }}>Kéo để sắp xếp</ThemedText>
                <Pressable onPress={() => onRemoveStop(item)}>
                  <ThemedText style={{ color: '#c0392b', fontWeight: '700' }}>{t('tripRemoveRoute')}</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </ScaleDecorator>
        );
      }}
      ListEmptyComponent={<ThemedText style={{ color: muted }}>{t('tripPlanStopsEmpty')}</ThemedText>}
    />
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  seq: { fontSize: 11, fontWeight: '700' },
  name: { flex: 1, fontWeight: '700' },
  status: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 14, justifyContent: 'flex-end' },
});
