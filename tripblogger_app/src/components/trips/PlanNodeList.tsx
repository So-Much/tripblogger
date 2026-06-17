import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapRouteStop } from '@/src/types/trip-map';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';

type PlanNodeListProps = {
  stops: MapRouteStop[];
  selectedStopId?: string | null;
  onSelectStop: (stop: MapRouteStop) => void;
  onRemoveStop: (stop: MapRouteStop) => void;
  onMoveUp: (stop: MapRouteStop) => void;
  onMoveDown: (stop: MapRouteStop) => void;
};

export function PlanNodeList({
  stops,
  selectedStopId,
  onSelectStop,
  onRemoveStop,
  onMoveUp,
  onMoveDown,
}: PlanNodeListProps) {
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <FlatList
      data={stops}
      keyExtractor={(item) => item.id}
      style={{ maxHeight: 220 }}
      contentContainerStyle={{ gap: 8 }}
      renderItem={({ item, index }) => {
        const selected = selectedStopId === item.id;
        return (
          <Pressable
            onPress={() => onSelectStop(item)}
            style={[
              styles.row,
              { borderColor: selected ? tint : border, backgroundColor: selected ? `${tint}10` : 'transparent' },
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
              <Pressable onPress={() => onMoveUp(item)} disabled={index === 0}>
                <ThemedText style={{ opacity: index === 0 ? 0.4 : 1 }}>↑</ThemedText>
              </Pressable>
              <Pressable onPress={() => onMoveDown(item)} disabled={index === stops.length - 1}>
                <ThemedText style={{ opacity: index === stops.length - 1 ? 0.4 : 1 }}>↓</ThemedText>
              </Pressable>
              <Pressable onPress={() => onRemoveStop(item)}>
                <ThemedText style={{ color: '#c0392b', fontWeight: '700' }}>Xóa</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={<ThemedText style={{ color: muted }}>Chưa có địa điểm nào trong kế hoạch.</ThemedText>}
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
