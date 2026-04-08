export type NotificationRealtimeEnvelope =
  | {
      type: 'notification.created';
      userId: string;
      unreadCount: number;
      notification: {
        id: string;
        type: string;
        title: string;
        body: string | null;
        actionUrl: string | null;
        isRead: boolean;
        readAt: string | null;
        createdAt: string;
      };
    }
  | {
      type: 'notification.unread-count';
      userId: string;
      unreadCount: number;
    };

export const NOTIFICATIONS_REDIS_CHANNEL = 'smart:notifications';
