export type MediaFrameSource = {
  width?: number;
  height?: number;
};

export function getContainedMediaFrame({
  source,
  maxWidth,
  maxHeight,
}: {
  source: MediaFrameSource;
  maxWidth: number;
  maxHeight: number;
}) {
  const safeMaxWidth = Math.max(maxWidth, 1);
  const safeMaxHeight = Math.max(maxHeight, 1);
  const sourceWidth = source.width ?? 0;
  const sourceHeight = source.height ?? 0;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: safeMaxWidth, height: safeMaxHeight };
  }

  const aspectRatio = sourceWidth / sourceHeight;
  const heightFromMaxWidth = safeMaxWidth / aspectRatio;

  if (heightFromMaxWidth <= safeMaxHeight) {
    return { width: safeMaxWidth, height: heightFromMaxWidth };
  }

  return { width: safeMaxHeight * aspectRatio, height: safeMaxHeight };
}
