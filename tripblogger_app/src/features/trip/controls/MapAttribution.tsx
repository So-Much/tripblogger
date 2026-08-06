import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Attribution for basemap (Apple/Google via RN Maps) + OSM POI data. */
export function MapAttribution() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: 88 + insets.bottom }]} pointerEvents="none">
      <Text style={styles.text}>© OpenStreetMap · Maps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
  },
  text: {
    fontSize: 10,
    color: '#334155',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
