import type { PostEditorMedia } from '@/src/types/post-editor-media';
import { postsService } from '@/src/services/api/posts.service';

function isRemoteUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function defaultMime(kind: 'image' | 'video', mimeType?: string): string {
  if (mimeType && mimeType.trim()) return mimeType;
  return kind === 'video' ? 'video/mp4' : 'image/jpeg';
}

function defaultFileName(kind: 'image' | 'video', fileName: string | undefined, stamp: number): string {
  if (fileName && fileName.trim()) return fileName;
  return `${kind}-${stamp}.${kind === 'video' ? 'mp4' : 'jpg'}`;
}

export async function uploadSingleEditorMedia(item: PostEditorMedia): Promise<PostEditorMedia> {
  if (!item.pendingUpload || isRemoteUrl(item.url)) {
    return { ...item, pendingUpload: false };
  }
  const kind = item.type === 'video' ? 'video' : 'image';
  const stamp = Date.now();
  const uploaded = await postsService.uploadMedia(
    {
      uri: item.url,
      name: defaultFileName(kind, item.fileName, stamp),
      type: defaultMime(kind, item.mimeType),
    },
    kind,
  );
  return {
    ...item,
    pendingUpload: false,
    mimeType: undefined,
    fileName: undefined,
    url: uploaded.url,
    thumbnailUrl: uploaded.thumbnailUrl,
    previewUrl: uploaded.previewUrl,
    originalUrl: uploaded.originalUrl,
    placeholder: uploaded.placeholder,
    width: uploaded.width ?? item.width,
    height: uploaded.height ?? item.height,
  };
}

export async function uploadAllPendingMedia(media: PostEditorMedia[]): Promise<PostEditorMedia[]> {
  const out: PostEditorMedia[] = [];
  for (const m of media) {
    out.push(await uploadSingleEditorMedia(m));
  }
  return out;
}
