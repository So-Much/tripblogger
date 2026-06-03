import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LegDirectionMarker } from '@/src/utils/leg-bearing';

type TripLegDirectionMarkerProps = {
  marker: LegDirectionMarker;
};

export function TripLegDirectionMarker({ marker }: TripLegDirectionMarkerProps) {
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');

  return (
    <Marker
      coordinate={marker.coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={marker.bearing}
      tracksViewChanges={false}>
      <View style={[styles.wrap, { backgroundColor: card, borderColor: tint }]}>
        <IconSymbol name="chevron.right" size={14} color={tint} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
