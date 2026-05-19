import type { MutableRefObject } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

type Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  /** Live zoom from parent (same as pinch) so Pan.onBegin never reads a stale React closure. */
  zoomValueRef: MutableRefObject<number>;
  disabled?: boolean;
};

/**
 * Vertical zoom rail on the right; panning updates zoom in real time (bottom = wide, top = zoomed in).
 */
export function TakeMediaZoomRail({ zoom, onZoomChange, zoomValueRef, disabled }: Props) {
  const trackHeight = useRef(1);
  const panOriginZoom = useRef(0);

  const setTrackHeight = useCallback((e: LayoutChangeEvent) => {
    trackHeight.current = Math.max(1, e.nativeEvent.layout.height);
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .runOnJS(true)
        .onBegin(() => {
          panOriginZoom.current = zoomValueRef.current;
        })
        .onUpdate((evt) => {
          const h = trackHeight.current;
          const next = clamp01(panOriginZoom.current - evt.translationY / h);
          onZoomChange(next);
        }),
    [disabled, onZoomChange, zoomValueRef],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.wrap} accessibilityRole="adjustable">
        <View style={styles.railCapsule}>
          <View style={styles.railFadeTop} pointerEvents="none" />
          <View style={[styles.track, disabled && styles.trackDisabled]} onLayout={setTrackHeight}>
            <View
              pointerEvents="none"
              style={[
                styles.thumbTravel,
                { height: `${Math.round(zoom * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.railFadeBottom} pointerEvents="none" />
        </View>
      </View>
    </GestureDetector>
  );
}

const RAIL_BG = 'rgba(22,22,24,0.72)';
const FILL = 'rgba(255,255,255,0.92)';

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: 'center',
    minHeight: 168,
    maxHeight: 300,
  },
  railCapsule: {
    width: 36,
    flex: 1,
    minHeight: 160,
    maxHeight: 280,
    backgroundColor: RAIL_BG,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  track: {
    flex: 1,
    width: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trackDisabled: { opacity: 0.35 },
  thumbTravel: {
    width: '100%',
    backgroundColor: FILL,
    borderRadius: 3,
    minHeight: 6,
  },
  railFadeTop: {
    height: 6,
    width: '100%',
  },
  railFadeBottom: {
    height: 6,
    width: '100%',
  },
});
