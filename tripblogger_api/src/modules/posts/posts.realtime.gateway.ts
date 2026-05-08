import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtPayload, verify } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import {
  CommentCreatedEventPayload,
  CommentReactionEventPayload,
  POSTS_REALTIME_EVENTS,
  PostReactionEventPayload,
  PostReactorsChangedPayload,
  PostShareEventPayload,
} from './posts.events';

@WebSocketGateway({
  namespace: '/posts',
  cors: true,
})
export class PostsRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PostsRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly configService: ConfigService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.disconnect(client, 'missing_token');
      return;
    }
    try {
      const payload = verify(
        token,
        this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      ) as JwtPayload & { sub?: string };
      if (!payload?.sub) {
        this.disconnect(client, 'invalid_token');
        return;
      }
      client.data.userId = String(payload.sub);
    } catch {
      this.disconnect(client, 'invalid_token');
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  @SubscribeMessage('post:join')
  onJoinPostRoom(client: Socket, postId: string) {
    if (!postId) return;
    void client.join(this.postRoom(postId));
  }

  @SubscribeMessage('post:leave')
  onLeavePostRoom(client: Socket, postId: string) {
    if (!postId) return;
    void client.leave(this.postRoom(postId));
  }

  emitPostReacted(payload: PostReactionEventPayload) {
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.postReacted, payload);
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.postReactorsChanged, {
      postId: payload.postId,
      total: Object.values(payload.reactionCounts).reduce((sum, v) => sum + v, 0) - payload.shareCount,
      eventAt: payload.eventAt,
    } satisfies PostReactorsChangedPayload);
  }

  emitPostShared(payload: PostShareEventPayload) {
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.postShared, payload);
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.postReactorsChanged, {
      postId: payload.postId,
      total: Object.values(payload.reactionCounts).reduce((sum, v) => sum + v, 0) - payload.shareCount,
      eventAt: payload.eventAt,
    } satisfies PostReactorsChangedPayload);
  }

  emitCommentCreated(payload: CommentCreatedEventPayload) {
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.commentCreated, payload);
  }

  emitCommentReacted(payload: CommentReactionEventPayload) {
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.commentReacted, payload);
  }

  emitPostReactorsChanged(payload: PostReactorsChangedPayload) {
    this.server.to(this.postRoom(payload.postId)).emit(POSTS_REALTIME_EVENTS.postReactorsChanged, payload);
  }

  private postRoom(postId: string) {
    return `post:${postId}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 10) return authToken;
    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 10) return queryToken;
    return null;
  }

  private disconnect(client: Socket, reason: string) {
    this.logger.warn(`Socket rejected: ${reason}`);
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}

