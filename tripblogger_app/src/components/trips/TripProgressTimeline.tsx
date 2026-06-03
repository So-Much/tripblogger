import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapRouteStop } from '@/src/types/trip-map';

type TripProgressTimelineProps = {
  stops: MapRouteStop[];
};

export function TripProgressTimeline({ stops }: TripProgressTimelineProps) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');

  if (stops.length === 0) return null;

  const visiting = stops.find((s) => s.status === 'VISITING');

  return (
    <View style={styles.wrap}>
      {visiting ? (
        <ThemedText style={{ color: tint, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
          Bạn đang ở: {visiting.name}
        </ThemedText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {stops.map((stop, index) => {
          const visited = stop.status === 'VISITED';
          const active = stop.status === 'VISITING';
          const planned = stop.status === 'PLANNED';
          return (
            <View key={stop.id} style={styles.item}>
              {index > 0 ? <View style={[styles.line, { backgroundColor: visited ? tint : border }]} /> : null}
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: active ? tint : border,
                    backgroundColor: visited ? tint : active ? `${tint}22` : card,
                  },
                ]}>
                {visited ? (
                  <IconSymbol name="checkmark.circle.fill" size={14} color="#fff" />
                ) : (
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: active ? tint : muted }}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  maxWidth: 64,
                  color: active ? tint : planned ? muted : tint,
                  fontWeight: active ? '700' : '500',
                }}>
                {stop.name}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8 },
  row: { alignItems: 'center', gap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', maxWidth: 120 },
  line: { width: 16, height: 2, marginHorizontal: 2 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
