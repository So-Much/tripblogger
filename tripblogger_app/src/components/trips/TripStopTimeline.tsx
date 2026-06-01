import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripStopDto } from '@/src/types/trip';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { tripStopName } from '@/src/utils/trip-display';
import { TripStatusBadge } from './TripStatusBadge';
import { resolveLocationTypeVisual } from '@/src/utils/location-type-display';

type TripStopTimelineProps = {
  stops: TripStopDto[];
  isActiveTrip?: boolean;
  onCheckin?: (stopId: string) => void;
  onComplete?: (stopId: string) => void;
};

export function TripStopTimeline({ stops, isActiveTrip, onCheckin, onComplete }: TripStopTimelineProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');

  if (!stops.length) {
    return (
      <View style={[styles.empty, { borderColor: border, backgroundColor: card }]}>
        <IconSymbol name="mappin.circle.fill" size={28} color={muted} />
        <ThemedText style={{ color: muted, textAlign: 'center' }}>
          Chưa có điểm dừng. Thêm địa điểm bên dưới.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {stops.map((stop, index) => {
        const isLast = index === stops.length - 1;
        const typeRef = stop.location?.locationType
          ? {
              code: stop.location.locationType.code,
              name: stop.location.locationType.name,
              icon: stop.location.locationType.icon,
            }
          : stop.customName
            ? { code: 'other', name: 'Tùy chỉnh' }
            : null;
        const visual = resolveLocationTypeVisual(typeRef);
        const dot = stop.status === 'VISITED' ? success : stop.status === 'VISITING' ? tint : visual.color;

        return (
          <View key={stop.id} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: dot, borderColor: card }]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: border }]} /> : null}
            </View>

            <View style={[styles.stopCard, { borderColor: border, backgroundColor: card }]}>
              <View style={styles.stopHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <LocationNameLabel
                    name={tripStopName(stop)}
                    locationType={typeRef}
                    variant="compact"
                    numberOfLines={2}
                  />
                </View>
                <TripStatusBadge kind="stop" status={stop.status} />
              </View>

              {stop.location?.address || stop.customAddress ? (
                <ThemedText style={{ color: muted, fontSize: 13 }} numberOfLines={2}>
                  {stop.location?.address ?? stop.customAddress}
                </ThemedText>
              ) : null}

              {stop.notes ? (
                <ThemedText style={{ color: muted, fontSize: 13, fontStyle: 'italic' }} numberOfLines={3}>
                  {stop.notes}
                </ThemedText>
              ) : null}

              {isActiveTrip && stop.status === 'PLANNED' && onCheckin ? (
                <PressableScale style={[styles.actionBtn, { borderColor: tint }]} onPress={() => onCheckin(stop.id)}>
                  <ThemedText style={{ color: tint, fontWeight: '700' }}>Check-in tại đây</ThemedText>
                </PressableScale>
              ) : null}
              {isActiveTrip && stop.status === 'VISITING' && onComplete ? (
                <PressableScale style={[styles.actionBtn, { backgroundColor: `${success}18`, borderColor: success }]} onPress={() => onComplete(stop.id)}>
                  <ThemedText style={{ color: success, fontWeight: '700' }}>Hoàn thành điểm dừng</ThemedText>
                </PressableScale>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: 0 },
  item: { flexDirection: 'row', gap: 12 },
  rail: { width: 20, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 16,
  },
  line: { width: 2, flex: 1, minHeight: 24, marginTop: 4 },
  stopCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  stopHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actionBtn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  empty: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
});
