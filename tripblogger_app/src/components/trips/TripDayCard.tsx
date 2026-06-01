import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripDayDto, TripStopDto } from '@/src/types/trip';
import { formatTripDate, tripStopName } from '@/src/utils/trip-display';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { TripStatusBadge } from './TripStatusBadge';

type TripDayCardProps = {
  day: TripDayDto;
  isActiveTrip: boolean;
  onPress: () => void;
  onCheckin?: (stopId: string) => void;
  onComplete?: (stopId: string) => void;
};

const PREVIEW_STOPS = 3;

export function TripDayCard({ day, isActiveTrip, onPress, onCheckin, onComplete }: TripDayCardProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');

  const visited = day.stops.filter((s) => s.status === 'VISITED').length;
  const total = day.stops.length;
  const progress = total > 0 ? visited / total : 0;

  return (
    <PressableScale style={[styles.card, { borderColor: border, backgroundColor: card }]} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.dayBadge, { backgroundColor: `${tint}18` }]}>
          <ThemedText style={{ color: tint, fontWeight: '800', fontSize: 15 }}>{day.dayNumber}</ThemedText>
        </View>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {day.title ?? `Ngày ${day.dayNumber}`}
          </ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>{formatTripDate(day.date)}</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={18} color={muted} />
      </View>

      <View style={styles.metaRow}>
        <ThemedText style={{ color: muted, fontSize: 13 }}>
          {total} điểm dừng
          {day.totalDistanceKm != null ? ` · ${day.totalDistanceKm.toFixed(1)} km` : ''}
        </ThemedText>
        {total > 0 ? (
          <ThemedText style={{ color: visited === total ? success : muted, fontSize: 12, fontWeight: '600' }}>
            {visited}/{total} đã ghé
          </ThemedText>
        ) : null}
      </View>

      {total > 0 ? (
        <View style={[styles.progressTrack, { backgroundColor: `${muted}22` }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: success }]} />
        </View>
      ) : null}

      {day.stops.length > 0 ? (
        <View style={styles.preview}>
          {day.stops.slice(0, PREVIEW_STOPS).map((stop) => (
            <StopPreviewRow
              key={stop.id}
              stop={stop}
              isActiveTrip={isActiveTrip}
              onCheckin={onCheckin}
              onComplete={onComplete}
            />
          ))}
          {day.stops.length > PREVIEW_STOPS ? (
            <ThemedText style={{ color: tint, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
              +{day.stops.length - PREVIEW_STOPS} điểm khác
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <ThemedText style={{ color: muted, fontSize: 13 }}>Chưa có điểm dừng — nhấn để thêm</ThemedText>
      )}
    </PressableScale>
  );
}

function StopPreviewRow({
  stop,
  isActiveTrip,
  onCheckin,
  onComplete,
}: {
  stop: TripStopDto;
  isActiveTrip: boolean;
  onCheckin?: (id: string) => void;
  onComplete?: (id: string) => void;
}) {
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.stopRow}>
      <View style={styles.stopLeft}>
        <LocationNameLabel
          name={tripStopName(stop)}
          locationType={
            stop.location?.locationType
              ? {
                  code: stop.location.locationType.code,
                  name: stop.location.locationType.name,
                  icon: stop.location.locationType.icon,
                }
              : stop.customName
                ? { code: 'other', name: 'Tùy chỉnh' }
                : null
          }
          variant="compact"
          numberOfLines={1}
        />
        <TripStatusBadge kind="stop" status={stop.status} />
      </View>
      {isActiveTrip && stop.status === 'PLANNED' && onCheckin ? (
        <PressableScale onPress={() => onCheckin(stop.id)} hitSlop={8}>
          <ThemedText style={{ color: tint, fontWeight: '600', fontSize: 13 }}>Check-in</ThemedText>
        </PressableScale>
      ) : null}
      {isActiveTrip && stop.status === 'VISITING' && onComplete ? (
        <PressableScale onPress={() => onComplete(stop.id)} hitSlop={8}>
          <ThemedText style={{ color: tint, fontWeight: '600', fontSize: 13 }}>Xong</ThemedText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  preview: { gap: 8, marginTop: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stopLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
});
