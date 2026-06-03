import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Marker } from 'react-native-maps';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import type { LocationTypeRef } from '@/src/utils/location-type-display';
import { resolveLocationTypeVisual } from '@/src/utils/location-type-display';

type TripMapLabeledMarkerProps = {
  latitude: number;
  longitude: number;
  name: string;
  locationType?: LocationTypeRef | null;
  selected?: boolean;
  variant?: 'checkpoint' | 'nearby' | 'route';
  sequenceNumber?: number;
  onPress?: () => void;
};

function markerLocationType(
  variant: 'checkpoint' | 'nearby' | 'route',
  locationType?: LocationTypeRef | null,
): LocationTypeRef | null {
  if (locationType) return locationType;
  if (variant === 'checkpoint') return { code: 'accommodation', name: 'Checkpoint' };
  if (variant === 'route') return { code: 'attraction', name: 'Lịch trình' };
  return { code: 'other', name: 'Địa điểm' };
}

export function TripMapLabeledMarker({
  latitude,
  longitude,
  name,
  locationType,
  selected = false,
  variant = 'nearby',
  sequenceNumber,
  onPress,
}: TripMapLabeledMarkerProps) {
  const card = useThemeColor({}, 'card');
  const resolvedType = markerLocationType(variant, locationType);
  const visual = resolveLocationTypeVisual(resolvedType);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={false}>
      <View style={styles.wrap}>
        <LocationNameLabel
          name={name}
          locationType={resolvedType}
          variant="marker"
          selected={selected}
          numberOfLines={2}
        />
        <View style={[styles.pinStem, { backgroundColor: visual.color }]} />
        <View style={[styles.pinCap, { borderColor: card }]}>
          {sequenceNumber != null ? (
            <View style={[styles.seqBadge, { backgroundColor: visual.color }]}>
              <ThemedText style={styles.seqText}>{sequenceNumber}</ThemedText>
            </View>
          ) : (
            <LocationTypeIcon locationType={resolvedType} size="sm" selected={selected} />
          )}
        </View>
        {variant === 'route' && selected ? (
          <View style={[styles.routePulse, { borderColor: visual.color }]} />
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    maxWidth: 160,
  },
  pinStem: {
    width: 3,
    height: 8,
    borderRadius: 2,
    marginTop: -1,
  },
  pinCap: {
    marginTop: -2,
    borderWidth: 2,
    borderRadius: 999,
    padding: 2,
  },
  routePulse: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    opacity: 0.35,
  },
  seqBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  seqText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
