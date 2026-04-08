import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { NotificationsRealtimeService } from './notifications-realtime.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsRealtimeService: NotificationsRealtimeService,
    private readonly pushService: PushService,
  ) {}

  async createForUser(params: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        actionUrl: params.actionUrl,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: params.userId,
        isRead: false,
      },
    });

    await this.notificationsRealtimeService.fanout({
      type: 'notification.created',
      userId: params.userId,
      unreadCount,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body ?? null,
        actionUrl: notification.actionUrl ?? null,
        isRead: notification.isRead,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      },
    });

    try {
      await this.pushService.queueDelivery({
        tenantId: params.tenantId,
        notificationId: notification.id,
        userId: params.userId,
        title: params.title,
        body: params.body,
        data: {
          actionUrl: params.actionUrl ?? null,
          type: params.type,
          ...(params.metadata ?? {}),
        },
      });
    } catch (error) {
      this.logger.warn(`Push delivery queue failed for notification ${notification.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    return notification;
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async unreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    await this.notificationsRealtimeService.fanout({
      type: 'notification.unread-count',
      userId,
      unreadCount,
    });

    return updated;
  }
}
