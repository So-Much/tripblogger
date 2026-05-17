/** Media row shape used by post composer and camera → composer handoff. */
export type PostEditorMedia = {
  localId: string;
  /** Server media row id after upload or when editing existing post media. */
  mediaId?: string;
  type: 'icon' | 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  /** When true, `url` is a local file URI and must be uploaded before submit. */
  pendingUpload?: boolean;
  /** Original MIME from picker/camera; used when uploading pending media. */
  mimeType?: string;
  /** Suggested filename for multipart upload. */
  fileName?: string;
  /** Composition used when capturing in-app (optional). */
  compositionId?: string;
};
