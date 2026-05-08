import { io, Socket } from 'socket.io-client/dist/socket.io.js';
import { apiBaseUrl } from '@/src/services/api/client';

type RealtimeHandler = (payload: unknown) => void;

const socketOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

class PostsRealtimeClient {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.socket = io(`${socketOrigin}/posts`, {
      transports: ['websocket'],
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, handler: RealtimeHandler) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: RealtimeHandler) {
    this.socket?.off(event, handler);
  }

  joinPost(postId: string) {
    this.socket?.emit('post:join', postId);
  }

  leavePost(postId: string) {
    this.socket?.emit('post:leave', postId);
  }
}

export const postsRealtimeClient = new PostsRealtimeClient();

