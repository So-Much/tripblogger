import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtPayload, verify } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripMemberEntity } from './entities/trip-member.entity';

@WebSocketGateway({ namespace: '/trips', cors: true })
export class TripsRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TripsRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(TripMemberEntity)
    private readonly membersRepo: Repository<TripMemberEntity>,
  ) {}

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
      const userId = String(payload.sub);
      client.data.userId = userId;
      const memberships = await this.membersRepo.find({
        where: { userId, status: 'ACCEPTED' },
      });
      for (const m of memberships) {
        void client.join(`trip:${m.tripId}`);
      }
    } catch {
      this.disconnect(client, 'invalid_token');
    }
  }

  handleDisconnect() {
    // no-op
  }

  @SubscribeMessage('trip:join')
  onJoin(client: Socket, tripId: string) {
    if (!tripId) return;
    void client.join(`trip:${tripId}`);
  }

  @SubscribeMessage('trip:leave')
  onLeave(client: Socket, tripId: string) {
    if (!tripId) return;
    void client.leave(`trip:${tripId}`);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 10) return authToken;
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;
    return null;
  }

  private disconnect(client: Socket, reason: string) {
    this.logger.debug(`Disconnect client ${client.id}: ${reason}`);
    client.disconnect(true);
  }
}
