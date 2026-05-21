import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedComments, PaginatedPosts, PostDto } from '@/src/types/post';

type PostPatch = {
  postId: string;
  reactionCounts?: Record<string, number>;
  myReactionCodes?: string[];
  commentCount?: number;
  shareCount?: number;
};

type CommentCreatedPayload = {
  postId: string;
  comment: {
    id: string;
    postId: string;
    displayName: string;
    content: string;
    parentCommentId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  commentCount: number;
};

function mergePostPatch(target: PostDto, patch: PostPatch): PostDto {
  return {
    ...target,
    reactionCounts: patch.reactionCounts ?? target.reactionCounts,
    myReactionCodes: patch.myReactionCodes ?? target.myReactionCodes,
    commentCount: patch.commentCount ?? target.commentCount,
    shareCount: patch.shareCount ?? target.shareCount,
  };
}

function patchInfinitePostLists(queryClient: QueryClient, keyPrefix: readonly unknown[], patch: PostPatch) {
  const cacheEntries = queryClient.getQueriesData<InfiniteData<PaginatedPosts>>({ queryKey: keyPrefix });
  for (const [key, value] of cacheEntries) {
    if (!value) continue;
    queryClient.setQueryData<InfiniteData<PaginatedPosts>>(key, {
      ...value,
      pages: value.pages.map((p) => ({
        ...p,
        items: p.items.map((it) => (it.id === patch.postId ? mergePostPatch(it, patch) : it)),
      })),
    });
  }
}

export function findPostInCaches(queryClient: QueryClient, postId: string): PostDto | undefined {
  const detail = queryClient.getQueryData<PostDto>(['posts', postId]);
  if (detail) return detail;

  for (const prefix of [['posts', 'mine'], ['posts', 'feed']] as const) {
    const entries = queryClient.getQueriesData<InfiniteData<PaginatedPosts>>({ queryKey: prefix });
    for (const [, value] of entries) {
      if (!value) continue;
      const hit = value.pages.flatMap((p) => p.items).find((it) => it.id === postId);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function computeOptimisticReaction(post: PostDto, typeCode: string) {
  const existedCode = post.myReactionCodes.find((code) => code !== 'SHARE');
  const isSame = existedCode === typeCode;
  const nextCounts = { ...post.reactionCounts };
  const nextMyReactionCodes: string[] = post.myReactionCodes.filter((code) => code === 'SHARE');
  if (existedCode) {
    nextCounts[existedCode] = Math.max((nextCounts[existedCode] ?? 0) - 1, 0);
  }
  if (!isSame) {
    nextCounts[typeCode] = (nextCounts[typeCode] ?? 0) + 1;
    nextMyReactionCodes.push(typeCode);
  }
  return { reactionCounts: nextCounts, myReactionCodes: nextMyReactionCodes };
}

export function optimisticTogglePostReaction(queryClient: QueryClient, postId: string, typeCode: string) {
  const post = findPostInCaches(queryClient, postId);
  if (!post) return null;
  const { reactionCounts, myReactionCodes } = computeOptimisticReaction(post, typeCode);
  applyPostPatch(queryClient, { postId, reactionCounts, myReactionCodes });
  return post;
}

export function applyPostPatch(queryClient: QueryClient, patch: PostPatch) {
  queryClient.setQueryData<PostDto>(['posts', patch.postId], (prev) => {
    if (!prev) return prev;
    return mergePostPatch(prev, patch);
  });

  patchInfinitePostLists(queryClient, ['posts', 'mine'], patch);
  patchInfinitePostLists(queryClient, ['posts', 'feed'], patch);
}

export function applyCommentCreated(queryClient: QueryClient, payload: CommentCreatedPayload) {
  applyPostPatch(queryClient, { postId: payload.postId, commentCount: payload.commentCount });
  queryClient.setQueryData<InfiniteData<PaginatedComments>>(['posts', payload.postId, 'comments'], (prev) => {
    if (!prev) return prev;
    const firstPage = prev.pages[0];
    if (!firstPage) return prev;
    const hasExisting = firstPage.items.some((c) => c.id === payload.comment.id);
    if (hasExisting) return prev;

    const updatedFirst = {
      ...firstPage,
      items: [payload.comment, ...firstPage.items],
    };
    return {
      ...prev,
      pages: [updatedFirst, ...prev.pages.slice(1)],
    };
  });
}
