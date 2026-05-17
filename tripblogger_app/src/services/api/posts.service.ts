import { apiBaseUrl, apiClient } from '@/src/services/api/client';
import type {
  CommentDto,
  PaginatedComments,
  PaginatedPosts,
  PostDto,
  ReactionTypeDto,
  PostReactorDto,
} from '@/src/types/post';

function apiOrigin(): string {
  try {
    const parsed = new URL(apiBaseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }
}

function toAbsolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const base = apiOrigin().replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizePost(post: PostDto): PostDto {
  return {
    ...post,
    media: (post.media ?? []).map((item) => ({
      ...item,
      url: toAbsolute(item.url) ?? item.url,
      thumbnailUrl: toAbsolute(item.thumbnailUrl),
      previewUrl: toAbsolute(item.previewUrl),
      originalUrl: toAbsolute(item.originalUrl),
    })),
  };
}

export const postsService = {
  async listReactionTypes(): Promise<ReactionTypeDto[]> {
    const res = await apiClient.get<ReactionTypeDto[]>('/posts/reaction-types');
    return res.data;
  },

  async listMine(params: { limit?: number; cursor?: string; status?: 'DRAFT' | 'PUBLISHED' }): Promise<PaginatedPosts> {
    const res = await apiClient.get<PaginatedPosts>('/posts/mine', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });
    return { ...res.data, items: res.data.items.map(normalizePost) };
  },

  async getPost(id: string): Promise<PostDto> {
    const res = await apiClient.get<PostDto>(`/posts/${id}`);
    return normalizePost(res.data);
  },

  async createPost(body: {
    title: string;
    contentHtml: string;
    media?: {
      mediaId?: string;
      type: 'icon' | 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
      previewUrl?: string;
      originalUrl?: string;
      placeholder?: string;
      width?: number;
      height?: number;
      compositionId?: string;
      iconCode?: string;
    }[];
    category?: string;
    tags?: string[];
    visibility?: 'PUBLIC' | 'PRIVATE';
    location?: { lat?: number; lng?: number; name?: string };
    status?: 'DRAFT' | 'PUBLISHED';
  }): Promise<PostDto> {
    const res = await apiClient.post<PostDto>('/posts', body);
    return normalizePost(res.data);
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
      media: {
        mediaId?: string;
        type: 'icon' | 'image' | 'video';
        url: string;
        thumbnailUrl?: string;
        previewUrl?: string;
        originalUrl?: string;
        placeholder?: string;
        width?: number;
        height?: number;
        compositionId?: string;
        iconCode?: string;
      }[];
      tags: string[];
    }>,
  ): Promise<PostDto> {
    const res = await apiClient.patch<PostDto>(`/posts/${id}`, body);
    return normalizePost(res.data);
  },

  async deletePost(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/posts/${id}`);
    return res.data;
  },

  async togglePostReaction(postId: string, typeCode: string): Promise<{ toggledOn: boolean; post: PostDto }> {
    const res = await apiClient.post<{ toggledOn: boolean; post: PostDto }>(`/posts/${postId}/reactions`, {
      typeCode,
    });
    return { ...res.data, post: normalizePost(res.data.post) };
  },

  async heartPost(postId: string): Promise<{ toggledOn: boolean; post: PostDto }> {
    const res = await apiClient.post<{ toggledOn: boolean; post: PostDto }>(`/posts/${postId}/reactions/heart`);
    return { ...res.data, post: normalizePost(res.data.post) };
  },

  async publishPost(postId: string): Promise<PostDto> {
    const res = await apiClient.post<PostDto>(`/posts/${postId}/publish`);
    return normalizePost(res.data);
  },

  async listPostReactors(postId: string): Promise<{ total: number; items: PostReactorDto[] }> {
    const res = await apiClient.get<{ total: number; items: PostReactorDto[] }>(`/posts/${postId}/reactions/actors`);
    return res.data;
  },

  async sharePost(postId: string) {
    const res = await apiClient.post<{ toggledOn: boolean; post: PostDto }>(`/posts/${postId}/share`);
    return { ...res.data, post: normalizePost(res.data.post) };
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
    typeCode: string,
  ): Promise<{ toggledOn: boolean; commentId: string }> {
    const res = await apiClient.post<{ toggledOn: boolean; commentId: string }>(
      `/posts/${postId}/comments/${commentId}/reactions`,
      { typeCode },
    );
    return res.data;
  },

  async uploadMedia(file: { uri: string; name: string; type: string }, kind: 'image' | 'video') {
    const body = new FormData();
    body.append('kind', kind);
    body.append('file', file as unknown as Blob);
    const res = await apiClient.post<{
      kind: 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
      previewUrl?: string;
      originalUrl?: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
      placeholder?: string;
      storage?: 'local' | 'cloud';
      sourcePath?: string;
    }>('/posts/media', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...res.data,
      url: toAbsolute(res.data.url) ?? res.data.url,
      thumbnailUrl: toAbsolute(res.data.thumbnailUrl),
      previewUrl: toAbsolute(res.data.previewUrl),
      originalUrl: toAbsolute(res.data.originalUrl),
    };
  },
};
