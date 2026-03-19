import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Socket } from 'socket.io-client';
import { EmployeeInboxItem, EmployeeInboxResponse } from '@smart/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Screen } from '../../components/ui/screen';
import { loadMyInbox, markMyNotificationRead } from '../../lib/api';
import { createCollaborationSocket } from '../../lib/collaboration-socket';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { createNotificationsSocket } from '../../lib/notifications-socket';

type InboxFilter = 'ALL' | 'TASK' | 'CHAT' | 'NOTIFICATION' | 'ANNOUNCEMENT';

export default function InboxScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const [data, setData] = useState<EmployeeInboxResponse | null>(null);
  const [meetingReminderMinutes, setMeetingReminderMinutes] = useState(15);
  const [taskReminderMinutes, setTaskReminderMinutes] = useState(60);
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyActionRequired, setOnlyActionRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderOptions = [5, 10, 15, 30, 60, 120] as const;

  function formatReminder(minutes: number) {
    if (minutes === 60) return '1H';
    if (minutes === 120) return '2H';
    return `${minutes} MIN`;
  }

  async function loadData() {
    try {
      setData(await loadMyInbox());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('inbox.loadError'));
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let collaborationSocket: Socket | null = null;
    let notificationsSocket: Socket | null = null;
    let isActive = true;

    void createCollaborationSocket().then((instance) => {
      if (!isActive) {
        instance.disconnect();
        return;
      }

      collaborationSocket = instance;
      collaborationSocket.on('chat:message', () => {
        void loadData();
      });
      collaborationSocket.on('chat:thread-updated', () => {
        void loadData();
      });
    });

    void createNotificationsSocket().then((instance) => {
      if (!isActive) {
        instance.disconnect();
        return;
      }

      notificationsSocket = instance;
      notificationsSocket.on('notifications:new', () => {
        void loadData();
      });
      notificationsSocket.on('notifications:unread-count', () => {
        void loadData();
      });
    });

    return () => {
      isActive = false;
      collaborationSocket?.disconnect();
      notificationsSocket?.disconnect();
    };
  }, []);

  const items = useMemo(() => {
    return (data?.items ?? []).filter((item) => {
      if (filter !== 'ALL' && item.kind !== filter) return false;
      if (onlyUnread && !item.isUnread) return false;
      if (onlyActionRequired && !item.isActionRequired) return false;
      return true;
    });
  }, [data?.items, filter, onlyUnread, onlyActionRequired]);

  function resolveKindLabel(item: EmployeeInboxItem) {
    if (item.kind === 'TASK') return t('inbox.kindTask');
    if (item.kind === 'CHAT') return t('inbox.kindChat');
    if (item.kind === 'ANNOUNCEMENT') return t('inbox.kindAnnouncement');
    return t('inbox.kindSystem');
  }

  function resolveMobileRoute(item: EmployeeInboxItem) {
    if (item.kind === 'TASK') return '/calendar';
    if (item.kind === 'CHAT') return `/chats?threadId=${item.entityId}`;
    if (item.kind === 'ANNOUNCEMENT') return '/announcements';
    if (item.actionUrl.includes('/employee/requests')) return '/requests';
    if (item.actionUrl.includes('/employee/chats')) return `/chats?threadId=${item.entityId}`;
    if (item.actionUrl.includes('/employee/announcements')) return '/announcements';
    return '/today';
  }

  async function openItem(item: EmployeeInboxItem) {
    if (item.kind === 'NOTIFICATION' && item.isUnread) {
      await markMyNotificationRead(item.entityId);
    }

    router.push(resolveMobileRoute(item) as never);
  }

  return (
    <Screen contentClassName="pb-10">
      <StatusBar style="dark" />

      <Card className="gap-4">
        <View className="gap-2">
          <Badge label={t('inbox.eyebrow')} variant="brand" />
          <Text className="text-[30px] font-extrabold text-foreground">{t('inbox.title')}</Text>
        </View>
        <View className="flex-row gap-3">
          <Card className="flex-1 gap-1 bg-surface-muted" inset="compact">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('inbox.needAttention')}</Text>
            <Text className="text-[28px] font-extrabold text-foreground">{data?.summary.totalAttention ?? 0}</Text>
          </Card>
          <Card className="flex-1 gap-1 bg-surface-muted" inset="compact">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('inbox.unreadChats')}</Text>
            <Text className="text-[28px] font-extrabold text-foreground">{data?.summary.unreadChats ?? 0}</Text>
          </Card>
        </View>
        <Button label={t('common.backHome')} onPress={() => router.push('/today' as never)} variant="ghost" />
      </Card>

      <Card className="gap-4">
        <Text className="text-[20px] font-extrabold text-foreground">{t('profile.notifications')}</Text>
        <View className="gap-2">
          <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('profile.notificationsMeetingReminder')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {reminderOptions.map((option) => {
              const isSelected = meetingReminderMinutes === option;

              return (
                <Pressable
                  key={`meeting-${option}`}
                  className={`rounded-full border-2 px-4 py-2.5 ${isSelected ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
                  onPress={() => setMeetingReminderMinutes(option)}
                >
                  <Text className={`text-[13px] font-bold ${isSelected ? 'text-brand-foreground' : 'text-foreground'}`}>{formatReminder(option)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('profile.notificationsTaskReminder')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {reminderOptions.map((option) => {
              const isSelected = taskReminderMinutes === option;

              return (
                <Pressable
                  key={`task-${option}`}
                  className={`rounded-full border-2 px-4 py-2.5 ${isSelected ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
                  onPress={() => setTaskReminderMinutes(option)}
                >
                  <Text className={`text-[13px] font-bold ${isSelected ? 'text-brand-foreground' : 'text-foreground'}`}>{formatReminder(option)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      {error ? (
        <Card className="border-danger bg-[#f6d9d2]">
          <Text className="text-[14px] leading-5 text-danger">{error}</Text>
        </Card>
      ) : null}

      <Card className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          {(['ALL', 'TASK', 'CHAT', 'NOTIFICATION', 'ANNOUNCEMENT'] as InboxFilter[]).map((value) => (
            <Pressable
              key={value}
              className={`rounded-2xl border-2 px-4 py-3 ${filter === value ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
              onPress={() => setFilter(value)}
            >
              <Text className={`text-[13px] font-bold ${filter === value ? 'text-brand-foreground' : 'text-foreground'}`}>
                {value === 'ALL' ? t('inbox.all') : resolveKindLabel({ kind: value } as EmployeeInboxItem)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            className={`rounded-2xl border-2 px-4 py-3 ${onlyUnread ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
            onPress={() => setOnlyUnread((current) => !current)}
          >
            <Text className={`text-[13px] font-bold ${onlyUnread ? 'text-brand-foreground' : 'text-foreground'}`}>{t('inbox.unread')}</Text>
          </Pressable>
          <Pressable
            className={`rounded-2xl border-2 px-4 py-3 ${onlyActionRequired ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
            onPress={() => setOnlyActionRequired((current) => !current)}
          >
            <Text className={`text-[13px] font-bold ${onlyActionRequired ? 'text-brand-foreground' : 'text-foreground'}`}>{t('inbox.actionRequired')}</Text>
          </Pressable>
        </View>
      </Card>

      {items.length ? (
        items.map((item) => (
          <Card key={item.id} className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <Badge label={resolveKindLabel(item)} variant="muted" />
                <Text className="text-[20px] font-extrabold text-foreground">{item.title}</Text>
              </View>
              <Badge label={item.badge ?? resolveKindLabel(item)} variant={item.isUnread || item.isActionRequired ? 'alert' : 'muted'} />
            </View>
            {item.preview ? <Text className="text-[15px] leading-6 text-foreground">{item.preview}</Text> : null}
            <Text className="text-[13px] leading-5 text-muted">
              {item.actor
                ? `${item.actor.firstName} ${item.actor.lastName} • ${new Date(item.createdAt).toLocaleString(locale)}`
                : new Date(item.createdAt).toLocaleString(locale)}
            </Text>
            <Button label={t('inbox.openItem')} onPress={() => void openItem(item)} />
          </Card>
        ))
      ) : (
        <Card>
          <Text className="text-[15px] leading-6 text-muted">{t('inbox.empty')}</Text>
        </Card>
      )}
    </Screen>
  );
}
