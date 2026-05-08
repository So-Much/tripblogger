import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedComments, PaginatedPosts, PostDto } from '@/src/types/post';

type PostPatch = {
  postId: string;
  reactionCounts?: Record<string, number>;
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

export function applyPostPatch(queryClient: QueryClient, patch: PostPatch) {
  queryClient.setQueryData<PostDto>(['posts', patch.postId], (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      reactionCounts: patch.reactionCounts ?? prev.reactionCounts,
      commentCount: patch.commentCount ?? prev.commentCount,
      shareCount: patch.shareCount ?? prev.shareCount,
    };
  });

  const cacheEntries = queryClient.getQueriesData<InfiniteData<PaginatedPosts>>({ queryKey: ['posts', 'mine'] });
  for (const [key, value] of cacheEntries) {
    if (!value) continue;
    queryClient.setQueryData<InfiniteData<PaginatedPosts>>(key, {
      ...value,
      pages: value.pages.map((p) => ({
        ...p,
        items: p.items.map((it) =>
          it.id === patch.postId
            ? {
                ...it,
                reactionCounts: patch.reactionCounts ?? it.reactionCounts,
                commentCount: patch.commentCount ?? it.commentCount,
                shareCount: patch.shareCount ?? it.shareCount,
              }
            : it,
        ),
      })),
    });
  }
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

