import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : typeof client.handshake.headers.authorization === 'string'
            ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
            : null;

      if (!rawToken) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtUser>(rawToken, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
      });

      client.data.userId = payload.sub;
      client.join(this.room(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.debug(`Notification socket disconnected for user ${String(client.data.userId)}`);
    }
  }

  emitNotification(userId: string, notification: unknown) {
    this.server.to(this.room(userId)).emit('notifications:new', notification);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server.to(this.room(userId)).emit('notifications:unread-count', { unreadCount });
  }

  getStats() {
    const sockets = this.server?.sockets as unknown as Map<string, unknown> | undefined;

    return {
      namespace: '/notifications',
      connectedClients: sockets?.size ?? 0,
    };
  }

  private room(userId: string) {
    return `user:${userId}`;
  }
}
