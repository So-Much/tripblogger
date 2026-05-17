import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isExpoGo } from '@/src/utils/is-expo-go';

export default function CaptureTabRoute() {
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const load = isExpoGo()
      ? import('@/src/screens/CompositionCameraExpoGoScreen').then((m) => m.CompositionCameraExpoGoScreen)
      : import('@/src/screens/CompositionCameraScreen').then((m) => m.CompositionCameraScreen);
    void load.then((C) => setScreen(() => C));
  }, []);

  if (!Screen) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Screen />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
