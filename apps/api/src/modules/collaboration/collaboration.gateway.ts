import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
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
import { WorkspaceAccessGuard } from '../../common/guards/workspace-access.guard';

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
    private readonly workspaceAccess: WorkspaceAccessGuard,
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
      await this.authorizeUser(payload.sub);

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
          thread: { OR: [
            { kind: 'DIRECT' },
            { kind: 'GROUP', group: { memberships: { some: { employeeId: employee.id } } } },
          ] },
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

  async emitThreadMessage(threadId: string, message: unknown) {
    // Resolve recipients at delivery time: stale socket rooms must not retain access.
    const participants = await this.prisma.chatParticipant.findMany({
      where: { threadId },
      select: { employeeId: true, employee: { select: { userId: true } }, thread: {
        select: { kind: true, group: { select: { memberships: { select: { employeeId: true } } } } },
      } },
    });
    for (const participant of participants) {
      if (participant.thread.kind === 'GROUP' &&
          !participant.thread.group?.memberships.some(m => m.employeeId === participant.employeeId)) continue;
      if (await this.canDeliver(participant.employee.userId)) {
        this.server.to(this.userRoom(participant.employee.userId)).emit('chat:message', message);
      }
    }
  }

  async emitThreadUpdated(userId: string, payload: unknown) {
    if (await this.canDeliver(userId)) this.server.to(this.userRoom(userId)).emit('chat:thread-updated', payload);
  }

  async emitWorkspaceRefresh(userId: string, payload: unknown) {
    if (await this.canDeliver(userId)) this.server.to(this.userRoom(userId)).emit('workspace:refresh', payload);
  }

  private async authorizeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    await this.workspaceAccess.authorize({
      sub: user.id, tenantId: user.tenantId, email: user.email,
      roleCodes: user.roles.map(r => r.role.code), workspaceAccessAllowed: user.workspaceAccessAllowed,
      preferredLocale: user.preferredLocale === 'ru' ? 'ru' : 'en',
    });
  }

  private async canDeliver(userId: string) {
    try { await this.authorizeUser(userId); return true; }
    catch (error) {
      if (!(error instanceof HttpException) || ![401, 402, 403].includes(error.getStatus())) throw error;
      this.server.in(this.userRoom(userId)).disconnectSockets(true);
      return false;
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private threadRoom(threadId: string) {
    return `thread:${threadId}`;
  }
}
