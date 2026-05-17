import type { CompositionOverlay } from '@/src/types/composition';

const INTERSECTION_POINTS = [
  { x: 33.33, y: 33.33 },
  { x: 66.66, y: 33.33 },
  { x: 33.33, y: 66.66 },
  { x: 66.66, y: 66.66 },
];

export function parseAspectRatio(value: string): number {
  const [w, h] = value.split(':').map(Number);
  if (!w || !h) return 4 / 3;
  return w / h;
}

export function pickOverlayForAspect(
  overlays: CompositionOverlay[],
  previewWidth: number,
  previewHeight: number,
): CompositionOverlay | null {
  if (!overlays.length || previewWidth <= 0 || previewHeight <= 0) return overlays[0] ?? null;
  const target = previewWidth / previewHeight;
  let best = overlays[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const o of overlays) {
    const delta = Math.abs(parseAspectRatio(o.aspectRatio) - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = o;
    }
  }
  return best ?? null;
}

export type NormalizedFace = {
  centerX: number;
  centerY: number;
};

export function normalizeFaceBounds(
  bounds: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number,
): NormalizedFace {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    centerX: (cx / frameWidth) * 100,
    centerY: (cy / frameHeight) * 100,
  };
}

/** True when face center is near a rule-of-thirds intersection (simple golden-point proxy). */
export function isFaceNearIntersection(face: NormalizedFace, threshold = 12): boolean {
  return INTERSECTION_POINTS.some((p) => {
    const dx = face.centerX - p.x;
    const dy = face.centerY - p.y;
    return Math.hypot(dx, dy) <= threshold;
  });
}

export function isFaceInPortraitRing(face: NormalizedFace): boolean {
  const dx = face.centerX - 50;
  const dy = face.centerY - 42;
  const dist = Math.hypot(dx / 22, dy / 22);
  return dist <= 1.15;
}

export function isFaceAlignedForSlug(slug: string, face: NormalizedFace): boolean {
  if (slug.includes('portrait')) return isFaceInPortraitRing(face);
  return isFaceNearIntersection(face);
}
