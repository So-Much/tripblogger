/** Media row shape used by post composer and camera → composer handoff. */
export type PostEditorMedia = {
  localId: string;
  type: 'icon' | 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  placeholder?: string;
  width?: number;
  height?: number;
};
