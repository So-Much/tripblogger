import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDayDto } from '@/src/types/trip';
import { countTripStops, tripProgressPercent } from '@/src/utils/trip-display';

type TripStatsRowProps = {
  days: TripDayDto[];
  showProgress?: boolean;
};

export function TripStatsRow({ days, showProgress }: TripStatsRowProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');

  const dayCount = days.length;
  const stopCount = countTripStops(days);
  const progress = tripProgressPercent(days);

  const stats = [
    { label: 'Số ngày', value: String(dayCount) },
    { label: 'Điểm dừng', value: String(stopCount) },
    ...(showProgress
      ? [{ label: 'Tiến độ', value: `${progress}%`, accent: progress > 0 ? success : tint }]
      : []),
  ];

  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.stat, { backgroundColor: card, borderColor: border }]}>
          <ThemedText type="defaultSemiBold" style={s.accent ? { color: s.accent } : undefined}>
            {s.value}
          </ThemedText>
          <ThemedText style={[styles.label, { color: muted }]}>{s.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
