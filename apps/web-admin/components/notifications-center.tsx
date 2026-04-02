'use client';

import { useEffect, useRef, useState } from 'react';
import { NotificationItem } from '@smart/types';
import { apiRequest } from '../lib/api';
import { getSession } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { createNotificationsSocket } from '../lib/notifications-socket';

export function NotificationsCenter({
  initialItems,
}: {
  initialItems?: NotificationItem[] | null;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>(initialItems ?? []);
  const didUseInitialItems = useRef(Boolean(initialItems));

  async function loadNotifications() {
    const session = getSession();
    if (!session) return;
    const data = await apiRequest<NotificationItem[]>('/notifications/me', { token: session.accessToken });
    setItems(data);
  }

  useEffect(() => {
    if (didUseInitialItems.current && initialItems) {
      didUseInitialItems.current = false;
      return;
    }

    void loadNotifications();
  }, [initialItems]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    const socket = createNotificationsSocket(session.accessToken);
    socket.on('notifications:new', (notification: NotificationItem) => {
      setItems((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [notification, ...current];
      });
    });
    socket.on('notifications:unread-count', () => {
      void loadNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function markRead(notificationId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    await loadNotifications();
  }

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <section className="section-stack">
      <section className="section-header">
        <span className="eyebrow">{t('nav.notifications')}</span>
        <h1>{t('notifications.title')}</h1>
        <p>{t('notifications.subtitle')}</p>
      </section>

      <section className="hero-grid">
        <article className="metric-card metric-card--accent">
          <span className="metric-label">{t('notifications.unread')}</span>
          <strong className="metric-value">{unreadCount}</strong>
        </article>
      </section>

      <section className="section-stack">
        {items.length > 0 ? (
          items.map((item) => (
            <article className="panel" key={item.id}>
              <div className="panel-header">
                <div>
                  <span className="section-kicker">{item.type}</span>
                  <h2>{item.title}</h2>
                </div>
                <span className={`status-chip ${item.isRead ? '' : 'is-alert'}`}>
                  {item.isRead ? 'READ' : 'NEW'}
                </span>
              </div>
              {item.body ? <p>{item.body}</p> : null}
              <div className="detail-list">
                <div className="detail-row">
                  <span>{t('schedule.date')}</span>
                  <strong>{new Date(item.createdAt).toLocaleString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Link</span>
                  <strong>{item.actionUrl ?? '-'}</strong>
                </div>
              </div>
              {!item.isRead ? (
                <div className="action-stack">
                  <button className="solid-button" onClick={() => void markRead(item.id)} type="button">
                    {t('notifications.markRead')}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="empty-state">{t('notifications.empty')}</div>
        )}
      </section>
    </section>
  );
}
