export type MediaKind = 'image' | 'video';
export type MediaStorage = 'local' | 'cloud';

export interface MediaVariants {
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl: string;
}

export interface PostMediaItem {
  type: 'icon' | 'image' | 'video';
  kind: MediaKind;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
  placeholder?: string;
  storage?: MediaStorage;
  sourcePath?: string;
  migratedAt?: string;
  available?: boolean;
  missingVariants?: string[];
  loadFailedAt?: string;
}

export function normalizePostMediaItem(input: Record<string, unknown>): PostMediaItem {
  const kind = (input.kind as MediaKind | undefined) ?? ((input.type as 'video' | 'image' | undefined) ?? 'image');
  const originalUrl = String(input.originalUrl ?? input.url ?? '');
  return {
    type: (input.type as 'icon' | 'image' | 'video' | undefined) ?? (kind === 'video' ? 'video' : 'image'),
    kind,
    url: String(input.url ?? originalUrl),
    thumbnailUrl: typeof input.thumbnailUrl === 'string' ? input.thumbnailUrl : undefined,
    previewUrl: typeof input.previewUrl === 'string' ? input.previewUrl : undefined,
    originalUrl,
    mimeType: typeof input.mimeType === 'string' ? input.mimeType : undefined,
    width: typeof input.width === 'number' ? input.width : undefined,
    height: typeof input.height === 'number' ? input.height : undefined,
    size: typeof input.size === 'number' ? input.size : undefined,
    placeholder: typeof input.placeholder === 'string' ? input.placeholder : undefined,
    storage: (input.storage as MediaStorage | undefined) ?? 'local',
    sourcePath: typeof input.sourcePath === 'string' ? input.sourcePath : undefined,
    migratedAt: typeof input.migratedAt === 'string' ? input.migratedAt : undefined,
    available: typeof input.available === 'boolean' ? input.available : undefined,
    missingVariants: Array.isArray(input.missingVariants) ? input.missingVariants.map(String) : undefined,
    loadFailedAt: typeof input.loadFailedAt === 'string' ? input.loadFailedAt : undefined,
  };
}
