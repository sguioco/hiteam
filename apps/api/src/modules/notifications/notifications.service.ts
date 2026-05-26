import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { NotificationsRealtimeService } from './notifications-realtime.service';

export type NotificationPushPreference =
  | 'assignmentAlerts'
  | 'taskDeadlineReminders'
  | 'meetingReminders'
  | 'shiftReminders';

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
    pushPreference?: NotificationPushPreference;
    forcePush?: boolean;
    suppressPush?: boolean;
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

    const shouldQueuePush = await this.shouldQueuePush({
      forcePush: params.forcePush,
      preference: params.pushPreference,
      suppressPush: params.suppressPush,
      userId: params.userId,
    });

    if (shouldQueuePush) {
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
    }

    return notification;
  }

  private async shouldQueuePush(params: {
    forcePush?: boolean;
    preference?: NotificationPushPreference;
    suppressPush?: boolean;
    userId: string;
  }) {
    if (params.forcePush) {
      return true;
    }

    if (params.suppressPush) {
      return false;
    }

    if (!params.preference) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        notificationAssignmentAlertsEnabled: true,
        notificationTaskDeadlineRemindersEnabled: true,
        notificationMeetingRemindersEnabled: true,
        notificationShiftRemindersEnabled: true,
      },
    });

    if (!user) {
      return false;
    }

    if (params.preference === 'assignmentAlerts') {
      return user.notificationAssignmentAlertsEnabled;
    }

    if (params.preference === 'taskDeadlineReminders') {
      return user.notificationTaskDeadlineRemindersEnabled;
    }

    if (params.preference === 'meetingReminders') {
      return user.notificationMeetingRemindersEnabled;
    }

    return user.notificationShiftRemindersEnabled;
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

  async markAllRead(userId: string) {
    const readAt = new Date();
    const { count } = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt,
      },
    });

    await this.notificationsRealtimeService.fanout({
      type: 'notification.unread-count',
      userId,
      unreadCount: 0,
    });

    return {
      updatedCount: count,
      readAt: readAt.toISOString(),
    };
  }
}
