export const POSTS_REALTIME_EVENTS = {
  postReacted: 'post.reacted',
  postShared: 'post.shared',
  commentCreated: 'comment.created',
  commentReacted: 'comment.reacted',
  postReactorsChanged: 'post.reactors.changed',
} as const;

export interface PostReactionEventPayload {
  postId: string;
  toggledOn: boolean;
  typeCode: string;
  reactionCounts: Record<string, number>;
  commentCount: number;
  shareCount: number;
  postUpdatedAt: string;
  eventAt: string;
}

export interface PostShareEventPayload {
  postId: string;
  toggledOn: boolean;
  reactionCounts: Record<string, number>;
  shareCount: number;
  postUpdatedAt: string;
  eventAt: string;
}

export interface CommentCreatedEventPayload {
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
  eventAt: string;
}

export interface CommentReactionEventPayload {
  postId: string;
  commentId: string;
  toggledOn: boolean;
  typeCode: string;
  eventAt: string;
}

export interface PostReactorsChangedPayload {
  postId: string;
  total: number;
  eventAt: string;
}

