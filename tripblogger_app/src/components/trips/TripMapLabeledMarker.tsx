import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type TripMapLabeledMarkerProps = {
  latitude: number;
  longitude: number;
  name: string;
  selected?: boolean;
  variant?: 'checkpoint' | 'nearby' | 'route';
  onPress?: () => void;
};

export function TripMapLabeledMarker({
  latitude,
  longitude,
  name,
  selected = false,
  variant = 'nearby',
  onPress,
}: TripMapLabeledMarkerProps) {
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

  const pinColor =
    variant === 'checkpoint' ? cta : variant === 'route' ? (selected ? cta : tint) : selected ? cta : tint;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={false}>
      <View style={styles.wrap}>
        <View
          style={[
            styles.label,
            {
              backgroundColor: card,
              borderColor: selected ? pinColor : border,
              borderWidth: selected ? 1.5 : 1,
            },
          ]}>
          <ThemedText style={[styles.labelText, { color: text }]} numberOfLines={2}>
            {name}
          </ThemedText>
        </View>
        <View style={[styles.dot, { backgroundColor: pinColor, borderColor: card }]} />
        {variant === 'route' ? (
          <View style={[styles.routeRing, { borderColor: pinColor }]} />
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    maxWidth: 140,
  },
  label: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  routeRing: {
    position: 'absolute',
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    opacity: 0.35,
  },
});
