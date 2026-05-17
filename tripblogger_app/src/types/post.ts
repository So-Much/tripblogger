export interface PostDto {
  id: string;
  userId: string;
  title: string;
  contentHtml: string;
  media: {
    id?: string;
    type?: 'icon' | 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
    iconCode?: string;
    kind?: 'image' | 'video';
    mimeType?: string;
    width?: number;
    height?: number;
    size?: number;
    placeholder?: string;
    storage?: 'local' | 'cloud';
    sourcePath?: string;
    migratedAt?: string;
    available?: boolean;
    missingVariants?: string[];
    loadFailedAt?: string;
    compositionId?: string;
  }[];
  category: string | null;
  tags: string[];
  visibility: 'PUBLIC' | 'PRIVATE';
  location: Record<string, unknown> | null;
  status: 'DRAFT' | 'PUBLISHED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  reactionCounts: Record<string, number>;
  myReactionCodes: string[];
  commentCount: number;
  shareCount: number;
}

export interface ReactionTypeDto {
  code: string;
  name: string;
  media: string | null;
  useFor: 'POST' | 'COMMENT' | 'BOTH';
}

export interface PostReactorDto {
  displayName: string;
  reactionCode: string;
  reactionName: string;
}

export interface CommentDto {
  id: string;
  displayName: string;
  postId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadedCommentDto extends CommentDto {
  replies: CommentDto[];
}

export interface PaginatedPosts {
  items: PostDto[];
  nextCursor: string | null;
}

export interface PaginatedComments {
  items: CommentDto[];
  threaded?: ThreadedCommentDto[];
  nextCursor: string | null;
}
