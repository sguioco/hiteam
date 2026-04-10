import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/ui/text';
import type { Socket } from 'socket.io-client';
import { ChatThreadItem } from '@smart/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Screen } from '../../components/ui/screen';
import { loadMyChats, markMyChatRead, sendMyChatMessage } from '../../lib/api';
import { createCollaborationSocket } from '../../lib/collaboration-socket';
import { useI18n } from '../../lib/i18n';
import { peekScreenCache, readScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { CHATS_SCREEN_CACHE_KEY, CHATS_SCREEN_CACHE_TTL_MS } from '../../lib/workspace-cache';

export default function ChatsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useLocalSearchParams<{ threadId?: string }>();
  const cachedThreads = peekScreenCache<ChatThreadItem[]>(CHATS_SCREEN_CACHE_KEY, CHATS_SCREEN_CACHE_TTL_MS);
  const [threads, setThreads] = useState<ChatThreadItem[]>(cachedThreads?.value ?? []);
  const [selectedThreadId, setSelectedThreadId] = useState(
    () => searchParams.threadId || cachedThreads?.value[0]?.id || '',
  );
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      const data = await loadMyChats();
      setThreads(data);
      setSelectedThreadId((current) => current || searchParams.threadId || data[0]?.id || '');
      await writeScreenCache(CHATS_SCREEN_CACHE_KEY, data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('chats.loadError'));
    }
  }

  useEffect(() => {
    let active = true;

    void readScreenCache<ChatThreadItem[]>(CHATS_SCREEN_CACHE_KEY, CHATS_SCREEN_CACHE_TTL_MS).then((cached) => {
      if (!active) {
        return;
      }

      if (cached?.value) {
        setThreads(cached.value);
        setSelectedThreadId((current) => current || searchParams.threadId || cached.value[0]?.id || '');

        if (!cached.isStale) {
          return;
        }
      }

      void loadData();
    });

    return () => {
      active = false;
    };
  }, [searchParams.threadId]);

  useEffect(() => {
    let socket: Socket | null = null;
    let isActive = true;

    void createCollaborationSocket().then((instance) => {
      if (!isActive) {
        instance.disconnect();
        return;
      }

      socket = instance;
      socket.on('chat:message', () => {
        void loadData();
      });
      socket.on('chat:thread-updated', () => {
        void loadData();
      });
    });

    return () => {
      isActive = false;
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    const selected = threads.find((item) => item.id === selectedThreadId);
    if (!selected || !selected.unreadCount) return;

    void markMyChatRead(selected.id).then(loadData);
  }, [selectedThreadId, threads]);

  async function sendMessage() {
    if (!selectedThreadId || !draft.trim()) return;

    try {
      await sendMyChatMessage(selectedThreadId, draft.trim());
      setDraft('');
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('chats.sendError'));
    }
  }

  const selected = threads.find((item) => item.id === selectedThreadId) ?? null;

  return (
    <Screen contentClassName="pb-10">
      <StatusBar style="dark" />

      <Card className="gap-4">
        <View className="gap-2">
          <Badge label={t('chats.eyebrow')} variant="brand" />
          <Text className="text-[30px] font-extrabold text-foreground">{t('chats.title')}</Text>
        </View>
        <Button label={t('common.backHome')} onPress={() => router.push('/today' as never)} variant="ghost" />
      </Card>

      {error ? (
        <Card className="border-danger bg-[#f6d9d2]">
          <Text className="text-[14px] leading-5 text-danger">{error}</Text>
        </Card>
      ) : null}

      <Card className="gap-3">
        <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted-foreground">{t('chats.threads')}</Text>
        {threads.length ? (
          threads.map((thread) => {
            const isActive = thread.id === selectedThreadId;
            const title =
              thread.title ??
              thread.group?.name ??
              thread.participants.map((participant) => `${participant.employee.firstName} ${participant.employee.lastName}`).join(', ');

            return (
              <Pressable
                key={thread.id}
                className={`rounded-2xl border-2 p-4 ${isActive ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
                onPress={() => setSelectedThreadId(thread.id)}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className={`flex-1 text-[15px] font-bold ${isActive ? 'text-brand-foreground' : 'text-foreground'}`}>{title}</Text>
                  {thread.unreadCount ? <Badge label={`${thread.unreadCount}`} variant="alert" /> : null}
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text className="text-[15px] leading-6 text-muted-foreground">{t('chats.emptyThreads')}</Text>
        )}
      </Card>

      <Card className="gap-3">
        <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted-foreground">{t('chats.messages')}</Text>
        {selected ? (
          <>
            {selected.messages.map((message) => (
              <View key={message.id} className="gap-1 border-t border-[#d3cbbd] pt-3">
                <Text className="text-[15px] font-bold text-foreground">
                  {message.authorEmployee.firstName} {message.authorEmployee.lastName}
                </Text>
                <Text className="text-[15px] leading-6 text-foreground">{message.body}</Text>
              </View>
            ))}
            <Input onChangeText={setDraft} placeholder={t('chats.writeMessage')} value={draft} />
            <Button label={t('chats.send')} onPress={() => void sendMessage()} />
          </>
        ) : (
          <Text className="text-[15px] leading-6 text-muted-foreground">{t('chats.emptySelection')}</Text>
        )}
      </Card>
    </Screen>
  );
}

