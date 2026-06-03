import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type DirectionsApp = 'tripblogger' | 'google' | 'apple';

type DirectionsAppIconProps = {
  app: DirectionsApp;
  size?: number;
};

const TRIPBLOGGER_ICON = require('@/assets/images/icon.png');

export function DirectionsAppIcon({ app, size = 28 }: DirectionsAppIconProps) {
  if (app === 'tripblogger') {
    return (
      <Image
        source={TRIPBLOGGER_ICON}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (app === 'google') {
    return (
      <View style={[styles.iconBox, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#fff' }]}>
        <MaterialCommunityIcons name="google-maps" size={size * 0.85} color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={[styles.iconBox, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#F2F2F7' }]}>
      <MaterialCommunityIcons name="apple" size={size * 0.55} color="#1D1D1F" />
      <MaterialCommunityIcons
        name="map-outline"
        size={size * 0.42}
        color="#007AFF"
        style={styles.appleMapOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  appleMapOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});
