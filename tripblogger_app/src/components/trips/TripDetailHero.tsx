import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDto } from '@/src/types/trip';
import { formatTripDateRange, formatVnd } from '@/src/utils/trip-display';
import { TripStatusBadge } from './TripStatusBadge';

type TripDetailHeroProps = {
  trip: TripDto;
};

export function TripDetailHero({ trip }: TripDetailHeroProps) {
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const spent = formatVnd(trip.actualBudget);
  const budget = formatVnd(trip.totalBudget);

  return (
    <View style={[styles.hero, { backgroundColor: primary, borderColor: border }]}>
      <View style={styles.topRow}>
        <TripStatusBadge kind="trip" status={trip.status} />
        {trip.isPublic ? (
          <View style={[styles.publicPill, { borderColor: border }]}>
            <ThemedText style={[styles.publicText, { color: muted }]}>Công khai</ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText type="title" style={styles.title}>
        {trip.title}
      </ThemedText>

      {trip.description ? (
        <ThemedText style={[styles.desc, { color: muted }]} numberOfLines={3}>
          {trip.description}
        </ThemedText>
      ) : null}

      {trip.destinationName ? (
        <View style={styles.row}>
          <IconSymbol name="mappin.circle.fill" size={18} color={tint} />
          <ThemedText style={styles.rowText} numberOfLines={2}>
            {trip.destinationName}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.row}>
        <IconSymbol name="clock.fill" size={18} color={tint} />
        <ThemedText style={[styles.rowText, { color: muted }]}>
          {formatTripDateRange(trip.startDate, trip.endDate)}
        </ThemedText>
      </View>

      {spent || budget ? (
        <View style={[styles.budgetRow, { borderTopColor: border }]}>
          {budget ? (
            <View style={styles.budgetItem}>
              <ThemedText style={[styles.budgetLabel, { color: muted }]}>Ngân sách</ThemedText>
              <ThemedText type="defaultSemiBold">{budget}</ThemedText>
            </View>
          ) : null}
          {spent ? (
            <View style={styles.budgetItem}>
              <ThemedText style={[styles.budgetLabel, { color: muted }]}>Đã chi</ThemedText>
              <ThemedText type="defaultSemiBold">{spent}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  publicPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  publicText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 26, lineHeight: 32 },
  desc: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20 },
  budgetRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  budgetItem: { flex: 1, gap: 2 },
  budgetLabel: { fontSize: 12, fontWeight: '600' },
});
