import { useCallback, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import type { FlashMode } from 'expo-camera';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

const ZOOM_STEP = 0.08;

/** iOS native a11y expects integer `now` / `min` / `max`; floats crash (e.g. 0.08). */
function zoomA11yValue(z: number) {
  const now = Math.round(z * 100);
  return { min: 0, max: 100, now: Math.min(100, Math.max(0, now)) };
}

type Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  flash: FlashMode;
  onFlashCycle: () => void;
  torch: boolean;
  onTorchToggle: () => void;
  disabled?: boolean;
};

function flashIconName(flash: FlashMode): IconSymbolName {
  if (flash === 'off') return 'bolt.slash.fill';
  if (flash === 'on') return 'bolt.fill';
  return 'bolt.badge.automatic';
}

const ICON = '#F2F2F7';
const ICON_DIM = 'rgba(242,242,247,0.55)';
const PILL_BG = 'rgba(22,22,24,0.94)';
const RAIL = 'rgba(255,255,255,0.22)';
const FILL = 'rgba(255,255,255,0.95)';

export function CaptureCameraControls({
  zoom,
  onZoomChange,
  flash,
  onFlashCycle,
  torch,
  onTorchToggle,
  disabled,
}: Props) {
  const { t } = useI18n();
  const trackWidth = useRef(1);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
  }, []);

  const applyLocalX = useCallback(
    (locationX: number) => {
      onZoomChange(clamp01(locationX / trackWidth.current));
    },
    [onZoomChange],
  );

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.pill}>
        <Pressable
          disabled={disabled}
          onPress={() => onZoomChange(clamp01(zoom - ZOOM_STEP))}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('captureZoomOut')}
          hitSlop={10}>
          <IconSymbol name="minus" size={20} color={ICON} />
        </Pressable>

        <Pressable
          disabled={disabled}
          onLayout={onTrackLayout}
          style={styles.track}
          onPress={(e) => applyLocalX(e.nativeEvent.locationX)}
          accessibilityRole="adjustable"
          accessibilityLabel={t('captureZoomLevel')}
          accessibilityValue={zoomA11yValue(zoom)}>
          <View pointerEvents="none" style={[styles.trackFill, { width: `${Math.round(zoom * 100)}%` }]} />
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onZoomChange(clamp01(zoom + ZOOM_STEP))}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('captureZoomIn')}
          hitSlop={10}>
          <IconSymbol name="plus" size={20} color={ICON} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          disabled={disabled}
          onPress={onFlashCycle}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('captureFlash')}
          hitSlop={10}>
          <IconSymbol name={flashIconName(flash)} size={20} color={flash === 'off' ? ICON_DIM : ICON} />
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={onTorchToggle}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed, torch && styles.hitTorch]}
          accessibilityRole="button"
          accessibilityState={{ selected: torch }}
          accessibilityLabel={t('captureTorch')}
          hitSlop={10}>
          <IconSymbol name="flashlight.on.fill" size={20} color={torch ? ICON : ICON_DIM} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: PILL_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: '96%',
  },
  hit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  hitTorch: {
    backgroundColor: 'rgba(255,200,80,0.22)',
  },
  track: {
    width: 88,
    height: 5,
    borderRadius: 3,
    backgroundColor: RAIL,
    overflow: 'hidden',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: FILL,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
