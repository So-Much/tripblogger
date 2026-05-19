import { useCallback, useImperativeHandle, useRef, forwardRef } from 'react';
import { Animated, View, ViewProps } from 'react-native';

export type ShakeViewHandle = {
  shake: () => void;
};

export const ShakeView = forwardRef<ShakeViewHandle, ViewProps>(function ShakeView(
  { children, style, ...rest },
  ref,
) {
  const translateX = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    translateX.setValue(0);
    Animated.sequence([
      Animated.timing(translateX, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [translateX]);

  useImperativeHandle(ref, () => ({ shake }), [shake]);

  return (
    <Animated.View style={[style, { transform: [{ translateX }] }]} {...rest}>
      {children}
    </Animated.View>
  );
});
