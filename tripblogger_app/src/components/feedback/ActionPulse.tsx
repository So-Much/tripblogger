import { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

type ActionPulseProps = {
  children: React.ReactNode;
  pulseKey?: number;
  style?: StyleProp<ViewStyle>;
};

export function ActionPulse({ children, pulseKey = 0, style }: ActionPulseProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulseKey) return;
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, [pulseKey, scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}
