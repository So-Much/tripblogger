import { StyleSheet, View } from 'react-native';

import type { CaptureFramePresetId } from './captureFramePresets';

const line = 'rgba(255,255,255,0.55)';

function ThirdsGrid() {
  return (
    <>
      <View style={[styles.vLine, { left: '33.33%' }]} />
      <View style={[styles.vLine, { left: '66.66%' }]} />
      <View style={[styles.hLine, { top: '33.33%' }]} />
      <View style={[styles.hLine, { top: '66.66%' }]} />
    </>
  );
}

function PostcardFrame() {
  return <View style={styles.postcardInner} />;
}

function PortraitCircle() {
  return <View style={styles.circleRing} />;
}

export function FrameOverlay({ preset }: { preset: CaptureFramePresetId }) {
  if (preset === 'none') return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {preset === 'thirds' ? <ThirdsGrid /> : null}
      {preset === 'postcard' ? <PostcardFrame /> : null}
      {preset === 'circle' ? <PortraitCircle /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: line,
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: line,
  },
  postcardInner: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: '10%',
    marginVertical: '14%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  circleRing: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '22%',
    bottom: '28%',
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
});
