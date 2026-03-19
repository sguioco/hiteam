import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { Socket } from 'socket.io-client';
import { AnnouncementItem } from '@smart/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Screen } from '../../components/ui/screen';
import { loadMyAnnouncements } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { createNotificationsSocket } from '../../lib/notifications-socket';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setItems(await loadMyAnnouncements());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('announcements.loadError'));
    }
  }

  useEffect(() => {
    void loadData();
  }, [t]);

  useEffect(() => {
    let socket: Socket | null = null;
    let isActive = true;

    void createNotificationsSocket().then((instance) => {
      if (!isActive) {
        instance.disconnect();
        return;
      }

      socket = instance;
      socket.on('notifications:new', () => {
        void loadData();
      });
    });

    return () => {
      isActive = false;
      socket?.disconnect();
    };
  }, []);

  return (
    <Screen contentClassName="pb-10">
      <StatusBar style="dark" />

      <Card className="gap-4">
        <View className="gap-2">
          <Badge label={t('announcements.eyebrow')} variant="brand" />
          <Text className="text-[30px] font-extrabold text-foreground">{t('announcements.title')}</Text>
        </View>
        <Button label={t('common.backHome')} onPress={() => router.push('/today' as never)} variant="ghost" />
      </Card>

      {error ? (
        <Card className="border-danger bg-[#f6d9d2]">
          <Text className="text-[14px] leading-5 text-danger">{error}</Text>
        </Card>
      ) : null}

      {items.length ? (
        items.map((item) => (
          <Card key={item.id} className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <Badge label={item.audience} variant="muted" />
                <Text className="text-[22px] font-extrabold text-foreground">{item.title}</Text>
              </View>
              {item.isPinned ? <Badge label={t('announcements.pinned')} variant="brand" /> : null}
            </View>
            <Text className="text-[15px] leading-6 text-foreground">{item.body}</Text>
            <Text className="text-[13px] leading-5 text-muted">
              {item.authorEmployee.firstName} {item.authorEmployee.lastName}
            </Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text className="text-[15px] leading-6 text-muted">{t('announcements.empty')}</Text>
        </Card>
      )}
    </Screen>
  );
}
