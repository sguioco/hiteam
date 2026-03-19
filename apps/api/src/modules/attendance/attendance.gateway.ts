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
  namespace: '/attendance-live',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AttendanceGateway.name);

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
      client.data.tenantId = payload.tenantId;
      client.join(this.room(payload.tenantId));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.tenantId) {
      this.logger.debug(`Attendance socket disconnected for tenant ${String(client.data.tenantId)}`);
    }
  }

  emitTeamLive(tenantId: string, sessions: unknown) {
    this.server.to(this.room(tenantId)).emit('attendance:team-live', sessions);
  }

  getStats() {
    const sockets = this.server?.sockets as unknown as Map<string, unknown> | undefined;

    return {
      namespace: '/attendance-live',
      connectedClients: sockets?.size ?? 0,
    };
  }

  private room(tenantId: string) {
    return `tenant:${tenantId}`;
  }
}
