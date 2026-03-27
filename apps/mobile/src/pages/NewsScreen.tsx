import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import { AnnouncementItem } from '@smart/types';
import { Card } from '../../components/ui/card';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Screen } from '../../components/ui/screen';
import { useAuthFlowState, hasManagerAccess } from '../../lib/auth-flow';
import {
  deleteManagerAnnouncement,
  loadManagerAnnouncements,
  loadMyAnnouncements,
  markMyAnnouncementRead,
  updateManagerAnnouncement,
} from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { createNotificationsSocket } from '../../lib/notifications-socket';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';
import BottomSheetModal from '../components/BottomSheetModal';

type NewsScreenProps = {
  standalone?: boolean;
};

function formatDate(value: string, language: 'ru' | 'en') {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const diffMs = Date.now() - parsed.getTime();
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < dayMs) {
    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
      return language === 'ru' ? `${minutes} МИН назад` : `${minutes} MIN ago`;
    }

    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return language === 'ru' ? `${hours} Ч назад` : `${hours} H ago`;
  }

  const includeYear = parsed.getFullYear() !== new Date().getFullYear();

  return parsed.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  });
}

function formatMetaLine(
  item: AnnouncementItem,
  language: 'ru' | 'en',
) {
  const authorName = `${item.authorEmployee.firstName} ${item.authorEmployee.lastName}`;
  const relativeOrDate = formatDate(item.createdAt, language);

  return language === 'ru'
    ? `${relativeOrDate} • ${authorName}`
    : `${relativeOrDate} by ${authorName}`;
}

export default function NewsScreen({ standalone = false }: NewsScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const { roleCodes } = useAuthFlowState();
  const isManager = hasManagerAccess(roleCodes);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [editingPinned, setEditingPinned] = useState(false);

  const copy = useMemo(
    () => ({
      title: language === 'ru' ? 'Новости команды' : 'Team news',
      empty: language === 'ru' ? 'Пока новостей нет.' : 'No news yet.',
      loading: language === 'ru' ? 'Загружаем новости...' : 'Loading news...',
      countLabel: (count: number) =>
        language === 'ru' ? `${count} новостей` : `${count} news`,
      hide: language === 'ru' ? 'Скрыть' : 'Hide',
      open: language === 'ru' ? 'Открыть' : 'Open',
      pin: language === 'ru' ? 'Pin' : 'Pin',
      unpin: language === 'ru' ? 'Unpin' : 'Unpin',
      edit: language === 'ru' ? 'Edit' : 'Edit',
      remove: language === 'ru' ? 'Delete' : 'Delete',
      editTitle: language === 'ru' ? 'Изменить новость' : 'Edit news',
      save: language === 'ru' ? 'Сохранить' : 'Save',
      cancel: language === 'ru' ? 'Отмена' : 'Cancel',
      deleteConfirmTitle: language === 'ru' ? 'Удалить новость?' : 'Delete news?',
      deleteConfirmBody: language === 'ru'
        ? 'Вы точно хотите удалить эту новость?'
        : 'Are you sure you want to delete this news item?',
      saveError: language === 'ru' ? 'Не удалось сохранить новость.' : 'Unable to save the news item.',
      deleteError: language === 'ru' ? 'Не удалось удалить новость.' : 'Unable to delete the news item.',
      titleRequired: language === 'ru' ? 'Введите заголовок новости.' : 'Enter a news title.',
      bodyRequired: language === 'ru' ? 'Введите текст новости.' : 'Enter the news text.',
    }),
    [language],
  );

  const orderedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [items]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const nextItems = isManager
        ? await loadManagerAnnouncements()
        : await loadMyAnnouncements();
      setItems(nextItems);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('announcements.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [isManager]);

  useEffect(() => {
    let socket: Socket | null = null;
    let active = true;

    void createNotificationsSocket().then((instance) => {
      if (!active) {
        instance.disconnect();
        return;
      }

      socket = instance;
      socket.on('notifications:new', () => {
        void loadData();
      });
      socket.on('notifications:unread-count', () => {
        void loadData();
      });
    });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [isManager]);

  async function handleOpen(item: AnnouncementItem) {
    const nextExpanded = expandedId === item.id ? null : item.id;
    setExpandedId(nextExpanded);

    if (isManager || nextExpanded !== item.id || item.isRead) {
      return;
    }

    try {
      const response = await markMyAnnouncementRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                isRead: true,
                readAt: response?.readAt ?? new Date().toISOString(),
              }
            : entry,
        ),
      );
    } catch {
      // Ignore read-sync failure and keep the news card open.
    }
  }

  function openEditor(item: AnnouncementItem) {
    setEditingItem(item);
    setEditingTitle(item.title);
    setEditingBody(item.body);
    setEditingPinned(item.isPinned);
  }

  async function handleTogglePinned(item: AnnouncementItem) {
    try {
      setSubmitting(true);
      const updated = await updateManagerAnnouncement(item.id, {
        title: item.title,
        body: item.body,
        isPinned: !item.isPinned,
      });
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingItem) {
      return;
    }

    if (!editingTitle.trim()) {
      Alert.alert('Error', copy.titleRequired);
      return;
    }

    if (!editingBody.trim()) {
      Alert.alert('Error', copy.bodyRequired);
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateManagerAnnouncement(editingItem.id, {
        title: editingTitle.trim(),
        body: editingBody.trim(),
        isPinned: editingPinned,
      });
      setItems((current) => current.map((entry) => (entry.id === editingItem.id ? updated : entry)));
      setEditingItem(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(item: AnnouncementItem) {
    Alert.alert(copy.deleteConfirmTitle, copy.deleteConfirmBody, [
      {
        text: copy.cancel,
        style: 'cancel',
      },
      {
        text: copy.remove,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSubmitting(true);
              await deleteManagerAnnouncement(item.id);
              setItems((current) => current.filter((entry) => entry.id !== item.id));
              if (expandedId === item.id) {
                setExpandedId(null);
              }
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : copy.deleteError);
            } finally {
              setSubmitting(false);
            }
          })();
        },
      },
    ]);
  }

  const content = (
    <>
      <View className="px-1">
        <Text className="text-[30px] font-extrabold text-foreground">
          {copy.title}
        </Text>
      </View>

      {error ? (
        <Card className="border-danger bg-[#f6d9d2]">
          <Text className="text-[14px] leading-5 text-danger">{error}</Text>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <Text className="text-[15px] leading-6 text-muted-foreground">{copy.loading}</Text>
        </Card>
      ) : orderedItems.length ? (
        <>
          <View className="px-1">
            <Text className="text-[12px] font-semibold uppercase tracking-[1.2px] text-[#58677d]">
              {copy.countLabel(orderedItems.length)}
            </Text>
          </View>

          <View className="overflow-hidden rounded-[28px] border border-white/30 bg-white/70 shadow-sm shadow-[#1f2687]/10">
            {orderedItems.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const isLast = index === orderedItems.length - 1;
              const shouldMute = expandedId !== null && !isExpanded;

              return (
                <Animated.View
                  entering={FadeInUp.delay(index * 26)
                    .duration(180)
                    .withInitialValues({
                      opacity: 0,
                      transform: [{ translateY: 10 }],
                    })}
                  key={item.id}
                  layout={LinearTransition.duration(180)}
                >
                  <PressableScale haptic="selection" onPress={() => void handleOpen(item)}>
                    <View
                      className="relative px-5 py-5"
                      style={{
                        opacity: shouldMute ? 0.58 : 1,
                      }}
                    >
                      {item.isPinned ? (
                        <MaterialCommunityIcons
                          color="#1f2937"
                          name="pin"
                          size={14}
                          style={{
                            position: 'absolute',
                            right: 20,
                            top: 20,
                            transform: [{ rotate: '45deg' }],
                          }}
                        />
                      ) : null}

                      <View className="gap-3">
                        <Text className="text-[13px] font-medium text-[#64748b]">
                          {formatMetaLine(item, language)}
                        </Text>

                        <View className="flex-row items-start justify-between gap-3">
                          <Text className="flex-1 text-[20px] font-extrabold text-foreground">
                            {item.title}
                          </Text>
                          <Ionicons
                            className="mt-1"
                            color="#94a3b8"
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                          />
                        </View>

                        {isExpanded ? (
                          <Animated.View layout={LinearTransition.duration(180)}>
                            <View className="gap-4">
                              {item.imageUrl ? (
                                <Image
                                  resizeMode="cover"
                                  source={{ uri: item.imageUrl }}
                                  style={{
                                    aspectRatio: announcementAspectRatioToNumber(
                                      item.imageAspectRatio ?? '16:9',
                                    ),
                                    borderRadius: 22,
                                    width: '100%',
                                  }}
                                />
                              ) : null}

                              <Text className="text-[15px] leading-7 text-foreground">
                                {item.body}
                              </Text>

                              {isManager ? (
                                <View className="flex-row flex-wrap items-center gap-4">
                                  <PressableScale
                                    className="flex-row items-center gap-1.5"
                                    disabled={submitting}
                                    haptic="selection"
                                    onPress={() => void handleTogglePinned(item)}
                                  >
                                    <MaterialCommunityIcons color="#334155" name="pin-outline" size={14} />
                                    <Text className="text-[14px] font-medium text-foreground">
                                      {item.isPinned ? copy.unpin : copy.pin}
                                    </Text>
                                  </PressableScale>

                                  <PressableScale
                                    className="flex-row items-center gap-1.5"
                                    disabled={submitting}
                                    haptic="selection"
                                    onPress={() => openEditor(item)}
                                  >
                                    <Ionicons color="#334155" name="create-outline" size={14} />
                                    <Text className="text-[14px] font-medium text-foreground">
                                      {copy.edit}
                                    </Text>
                                  </PressableScale>

                                  <PressableScale
                                    className="flex-row items-center gap-1.5"
                                    disabled={submitting}
                                    haptic="selection"
                                    onPress={() => handleDelete(item)}
                                  >
                                    <Ionicons color="#dc2626" name="trash-outline" size={14} />
                                    <Text className="text-[14px] font-medium text-[#dc2626]">
                                      {copy.remove}
                                    </Text>
                                  </PressableScale>
                                </View>
                              ) : null}
                            </View>
                          </Animated.View>
                        ) : null}
                      </View>
                    </View>
                  </PressableScale>

                  {!isLast ? <View className="h-px bg-black/15" /> : null}
                </Animated.View>
              );
            })}
          </View>
        </>
      ) : (
        <Card>
          <Text className="text-[15px] leading-6 text-muted-foreground">{copy.empty}</Text>
        </Card>
      )}
    </>
  );

  if (standalone) {
    return (
      <>
        <Screen contentClassName="pb-10 pt-3" withGradient>{content}</Screen>
        <BottomSheetModal
          onClose={() => setEditingItem(null)}
          sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
          visible={editingItem !== null}
        >
          <View className="mb-4 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-display text-[24px] font-bold text-foreground">
                {copy.editTitle}
              </Text>
            </View>
            <PressableScale
              className="h-10 min-w-[72px] items-center justify-center rounded-full px-3"
              haptic="selection"
              onPress={() => setEditingItem(null)}
            >
              <Text className="text-[15px] font-semibold text-foreground">{copy.cancel}</Text>
            </PressableScale>
          </View>

          <View className="gap-4">
            <TextInput
              className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
              onChangeText={setEditingTitle}
              placeholder={copy.title}
              style={{ paddingHorizontal: 18, paddingVertical: 16 }}
              value={editingTitle}
            />

            <TextInput
              className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
              multiline
              numberOfLines={8}
              onChangeText={setEditingBody}
              placeholder={copy.open}
              textAlignVertical="top"
              value={editingBody}
            />

            <PressableScale
              className="flex-row items-center gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10"
              haptic="selection"
              onPress={() => setEditingPinned((current) => !current)}
            >
              <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${editingPinned ? 'border-primary bg-primary' : 'border-border bg-white'}`}>
                {editingPinned ? <Ionicons color="#ffffff" name="checkmark" size={15} /> : null}
              </View>
              <Text className="text-[14px] font-semibold text-foreground">{copy.pin}</Text>
            </PressableScale>

            <PressableScale
              className={`rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30 ${submitting ? 'opacity-60' : ''}`}
              disabled={submitting}
              haptic="selection"
              onPress={() => void handleSaveEdit()}
            >
              <Text className="text-center font-display text-[16px] font-semibold text-white">
                {copy.save}
              </Text>
            </PressableScale>
          </View>
        </BottomSheetModal>
      </>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{
          paddingBottom: 124,
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">{content}</View>
      </ScrollView>

      <BottomSheetModal
        onClose={() => setEditingItem(null)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={editingItem !== null}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">
              {copy.editTitle}
            </Text>
          </View>
          <PressableScale
            className="h-10 min-w-[72px] items-center justify-center rounded-full px-3"
            haptic="selection"
            onPress={() => setEditingItem(null)}
          >
            <Text className="text-[15px] font-semibold text-foreground">{copy.cancel}</Text>
          </PressableScale>
        </View>

        <View className="gap-4">
          <TextInput
            className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
            onChangeText={setEditingTitle}
            placeholder={copy.title}
            style={{ paddingHorizontal: 18, paddingVertical: 16 }}
            value={editingTitle}
          />

          <TextInput
            className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
            multiline
            numberOfLines={8}
            onChangeText={setEditingBody}
            placeholder={copy.open}
            textAlignVertical="top"
            value={editingBody}
          />

          <PressableScale
            className="flex-row items-center gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10"
            haptic="selection"
            onPress={() => setEditingPinned((current) => !current)}
          >
            <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${editingPinned ? 'border-primary bg-primary' : 'border-border bg-white'}`}>
              {editingPinned ? <Ionicons color="#ffffff" name="checkmark" size={15} /> : null}
            </View>
            <Text className="text-[14px] font-semibold text-foreground">{copy.pin}</Text>
          </PressableScale>

          <PressableScale
            className={`rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30 ${submitting ? 'opacity-60' : ''}`}
            disabled={submitting}
            haptic="selection"
            onPress={() => void handleSaveEdit()}
          >
            <Text className="text-center font-display text-[16px] font-semibold text-white">
              {copy.save}
            </Text>
          </PressableScale>
        </View>
      </BottomSheetModal>
    </>
  );
}
