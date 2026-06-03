import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapRouteStop } from '@/src/types/trip-map';

function formatCheckinDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

type TripRouteStopMarkerProps = {
  stop: MapRouteStop;
  sequenceIndex: number;
  onPress?: () => void;
};

export function TripRouteStopMarker({ stop, sequenceIndex, onPress }: TripRouteStopMarkerProps) {
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');

  const visited = stop.status === 'VISITED';
  const visiting = stop.status === 'VISITING';
  const checkinLabel = visited ? formatCheckinDay(stop.visitedAt) : null;

  return (
    <Marker
      coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
      tracksViewChanges={false}>
      <View style={styles.wrap}>
        <View
          style={[
            styles.circle,
            {
              borderColor: visiting ? tint : visited ? tint : muted,
              backgroundColor: visited ? tint : visiting ? `${tint}22` : card,
            },
            visiting && styles.visitingRing,
          ]}>
          {visited ? (
            <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
          ) : (
            <ThemedText style={{ color: visiting ? tint : muted, fontSize: 12, fontWeight: '800' }}>
              {sequenceIndex}
            </ThemedText>
          )}
        </View>
        {checkinLabel ? (
          <ThemedText style={[styles.dayLabel, { color: tint }]}>{checkinLabel}</ThemedText>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitingRing: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
