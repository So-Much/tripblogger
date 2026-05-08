import { apiClient } from '@/src/services/api/client';
import type {
  CommentDto,
  PaginatedComments,
  PaginatedPosts,
  PostDto,
  ReactionTypeDto,
} from '@/src/types/post';

export const postsService = {
  async listReactionTypes(): Promise<ReactionTypeDto[]> {
    const res = await apiClient.get<ReactionTypeDto[]>('/posts/reaction-types');
    return res.data;
  },

  async listMine(params: { limit?: number; cursor?: string }): Promise<PaginatedPosts> {
    const res = await apiClient.get<PaginatedPosts>('/posts/mine', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    });
    return res.data;
  },

  async getPost(id: string): Promise<PostDto> {
    const res = await apiClient.get<PostDto>(`/posts/${id}`);
    return res.data;
  },

  async createPost(body: {
    title: string;
    contentHtml: string;
    media?: string[];
    category?: string;
    tags?: string[];
    visibility?: 'PUBLIC' | 'PRIVATE';
    location?: { lat?: number; lng?: number; name?: string };
    status?: 'DRAFT' | 'PUBLISHED';
  }): Promise<PostDto> {
    const res = await apiClient.post<PostDto>('/posts', body);
    return res.data;
  },

  async updatePost(
    id: string,
    body: Partial<{
      title: string;
      contentHtml: string;
      visibility: 'PUBLIC' | 'PRIVATE';
      status: 'DRAFT' | 'PUBLISHED' | 'DELETED';
      category: string | null;
      location: { lat?: number; lng?: number; name?: string } | null;
    }>,
  ): Promise<PostDto> {
    const res = await apiClient.patch<PostDto>(`/posts/${id}`, body);
    return res.data;
  },

  async deletePost(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/posts/${id}`);
    return res.data;
  },

  async togglePostReaction(postId: string, typeId: string): Promise<{ toggledOn: boolean; post: PostDto }> {
    const res = await apiClient.post<{ toggledOn: boolean; post: PostDto }>(`/posts/${postId}/reactions`, {
      typeId,
    });
    return res.data;
  },

  async sharePost(postId: string) {
    const res = await apiClient.post<{ toggledOn: boolean; post: PostDto }>(`/posts/${postId}/share`);
    return res.data;
  },

  async addComment(postId: string, body: { content: string; parentCommentId?: string }): Promise<CommentDto> {
    const res = await apiClient.post<CommentDto>(`/posts/${postId}/comments`, body);
    return res.data;
  },

  async listComments(
    postId: string,
    params: { limit?: number; cursor?: string },
  ): Promise<PaginatedComments> {
    const res = await apiClient.get<PaginatedComments>(`/posts/${postId}/comments`, {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    });
    return res.data;
  },

  async toggleCommentReaction(
    postId: string,
    commentId: string,
    typeId: string,
  ): Promise<{ toggledOn: boolean; commentId: string }> {
    const res = await apiClient.post<{ toggledOn: boolean; commentId: string }>(
      `/posts/${postId}/comments/${commentId}/reactions`,
      { typeId },
    );
    return res.data;
  },
};
