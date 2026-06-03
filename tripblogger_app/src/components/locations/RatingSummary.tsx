import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LocationReviewSummary } from '@/src/services/api/reviews.service';

type RatingSummaryProps = {
  summary: LocationReviewSummary;
};

export function RatingSummary({ summary }: RatingSummaryProps) {
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const total = summary.total || 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <ThemedText style={[styles.avg, { color: tint }]}>{summary.avgRating.toFixed(1)}</ThemedText>
        <ThemedText style={{ color: muted, fontSize: 12 }}>
          {summary.total} đánh giá
        </ThemedText>
      </View>
      <View style={styles.bars}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.distribution[star] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <View key={star} style={styles.row}>
              <ThemedText style={[styles.starLabel, { color: muted }]}>{star}★</ThemedText>
              <View style={[styles.track, { backgroundColor: `${muted}22` }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tint }]} />
              </View>
              <ThemedText style={[styles.pct, { color: muted }]}>{pct}%</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  left: { alignItems: 'center', minWidth: 72 },
  avg: { fontSize: 32, fontWeight: '800' },
  bars: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starLabel: { width: 24, fontSize: 11, fontWeight: '600' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { width: 32, fontSize: 10, textAlign: 'right' },
});
