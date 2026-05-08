export interface PostDto {
  id: string;
  userId: string;
  title: string;
  contentHtml: string;
  media: string[];
  category: string | null;
  tags: string[];
  visibility: 'PUBLIC' | 'PRIVATE';
  location: Record<string, unknown> | null;
  status: 'DRAFT' | 'PUBLISHED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  reactionCounts: Record<string, number>;
  myReactionTypeIds: string[];
}

export interface ReactionTypeDto {
  id: string;
  code: string;
  name: string;
  media: string | null;
  useFor: 'POST' | 'COMMENT' | 'BOTH';
}

export interface CommentDto {
  id: string;
  userId: string;
  postId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPosts {
  items: PostDto[];
  nextCursor: string | null;
}

export interface PaginatedComments {
  items: CommentDto[];
  nextCursor: string | null;
}
