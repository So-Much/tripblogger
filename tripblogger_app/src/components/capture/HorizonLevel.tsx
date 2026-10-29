import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

type Props = {
  rollDeg: number;
  level: boolean;
};

export function HorizonLevel({ rollDeg, level }: Props) {
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${withTiming(rollDeg, { duration: 80 })}deg` }],
    backgroundColor: withTiming(level ? '#34D399' : 'rgba(255,255,255,0.55)', { duration: 120 }),
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.line, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 72,
    height: 2,
    borderRadius: 1,
  },
});
