export type CaptureFramePresetId = 'none' | 'thirds' | 'postcard' | 'circle';

export const CAPTURE_FRAME_PRESETS: {
  id: CaptureFramePresetId;
  labelKey: 'captureFrameNone' | 'captureFrameThirds' | 'captureFramePostcard' | 'captureFrameCircle';
}[] = [
  { id: 'none', labelKey: 'captureFrameNone' },
  { id: 'thirds', labelKey: 'captureFrameThirds' },
  { id: 'postcard', labelKey: 'captureFramePostcard' },
  { id: 'circle', labelKey: 'captureFrameCircle' },
];
