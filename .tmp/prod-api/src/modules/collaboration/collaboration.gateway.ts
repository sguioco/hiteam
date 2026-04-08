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
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
      client.join(this.userRoom(payload.sub));

      const employee = await this.prisma.employee.findUnique({ where: { userId: payload.sub } });
      if (!employee) {
        client.disconnect();
        return;
      }

      const participations = await this.prisma.chatParticipant.findMany({
        where: {
          employeeId: employee.id,
        },
        select: {
          threadId: true,
        },
      });

      for (const item of participations) {
        client.join(this.threadRoom(item.threadId));
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.debug(`Collaboration socket disconnected for user ${String(client.data.userId)}`);
    }
  }

  emitThreadMessage(threadId: string, message: unknown) {
    this.server.to(this.threadRoom(threadId)).emit('chat:message', message);
  }

  emitThreadUpdated(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('chat:thread-updated', payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private threadRoom(threadId: string) {
    return `thread:${threadId}`;
  }
}
