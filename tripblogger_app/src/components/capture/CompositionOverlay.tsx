import { useEffect } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { pickOverlayForAspect } from '@/src/utils/composition-geometry';
import type { CompositionOverlay as CompositionOverlayType } from '@/src/types/composition';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  overlays: CompositionOverlayType[];
  previewWidth: number;
  previewHeight: number;
  visible: boolean;
  steady: boolean;
  level: boolean;
  faceAligned: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
};

export function CompositionOverlay({
  overlays,
  previewWidth,
  previewHeight,
  visible,
  steady,
  level,
  faceAligned,
  onLayout,
}: Props) {
  const opacity = useSharedValue(0);
  const stroke = useSharedValue('rgba(255,255,255,0.38)');

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(0.38, { duration: 420 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, opacity]);

  useEffect(() => {
    if (!visible) return;
    if (faceAligned) {
      stroke.value = withTiming('#34D399', { duration: 160 });
      opacity.value = withTiming(0.88, { duration: 160 });
    } else if (steady && level) {
      stroke.value = withTiming('rgba(255,255,255,0.88)', { duration: 160 });
      opacity.value = withTiming(0.85, { duration: 160 });
    } else {
      stroke.value = withTiming('rgba(255,255,255,0.38)', { duration: 160 });
      opacity.value = withTiming(0.38, { duration: 160 });
    }
  }, [visible, steady, level, faceAligned, stroke, opacity]);

  const overlay = pickOverlayForAspect(overlays, previewWidth, previewHeight);
  const animatedProps = useAnimatedProps(() => ({
    stroke: stroke.value,
    strokeOpacity: opacity.value,
  }));

  if (!visible || !overlay?.svgPath) return null;

  return (
    <View style={styles.wrap} pointerEvents="none" onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <AnimatedPath
          d={overlay.svgPath}
          fill="none"
          strokeWidth={0.55}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    bottom: 120,
    zIndex: 2,
  },
});
