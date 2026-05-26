import type { PostDto } from '@/src/types/post';

/** Reaction types the viewer chose on this post (excludes SHARE). */
export function getViewerPostReactionCode(post: PostDto): string | null {
  const codes = post.myReactionCodes ?? [];
  return codes.find((code) => code && code !== 'SHARE') ?? null;
}

/** Whether the viewer hearted this post (not merely whether the post has likes). */
export function isViewerPostHearted(post: PostDto): boolean {
  return (post.myReactionCodes ?? []).includes('HEART');
}

export function getPostReactionTotal(post: PostDto): number {
  return Object.entries(post.reactionCounts ?? {}).reduce(
    (acc, [code, count]) => acc + (code === 'SHARE' ? 0 : Number(count) || 0),
    0,
  );
}
