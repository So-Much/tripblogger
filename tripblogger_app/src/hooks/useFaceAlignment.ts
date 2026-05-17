import { useCallback, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  isFaceAlignedForSlug,
  normalizeFaceBounds,
  type NormalizedFace,
} from '@/src/utils/composition-geometry';

export function useFaceAlignment(slug: string, enabled: boolean) {
  const faceAligned = useSharedValue(false);
  const primaryFace = useSharedValue<NormalizedFace | null>(null);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  const onFaces = useCallback((aligned: boolean, face: NormalizedFace | null) => {
    faceAligned.value = aligned;
    primaryFace.value = face;
  }, [faceAligned, primaryFace]);

  const faceDetector = useFaceDetector({ performanceMode: 'fast' });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!enabled) return;
      const faces = faceDetector.detectFaces(frame);
      if (!faces.length) {
        runOnJS(onFaces)(false, null);
        return;
      }
      const f = faces[0];
      const normalized = normalizeFaceBounds(f.bounds, frame.width, frame.height);
      const aligned = isFaceAlignedForSlug(slugRef.current, normalized);
      runOnJS(onFaces)(aligned, normalized);
    },
    [enabled, faceDetector, onFaces],
  );

  return { frameProcessor, faceAligned, primaryFace };
}
