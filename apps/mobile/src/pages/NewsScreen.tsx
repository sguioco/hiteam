import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Image, ScrollView, TextInput, View } from 'react-native';
import { Text } from '../../components/ui/text';
import Animated, {
  Easing,
  FadeInUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';
import { AnnouncementItem } from '@smart/types';
import { Button } from '../../components/ui/button';
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
import {
  getDateLocale,
  getTextDirectionStyle,
  type AppLanguage,
  useI18n,
} from '../../lib/i18n';
import { createNotificationsSocket } from '../../lib/notifications-socket';
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { shouldHideTranslatedSourceText } from '../../lib/live-translation-policy';
import { hasResolvedLiveText, primeLiveTextMap, useLiveTextMap } from '../../lib/use-live-text-map';
import { getNewsScreenCacheKey, NEWS_SCREEN_CACHE_TTL_MS, warmAnnouncementImages } from '../../lib/workspace-cache';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';
import BottomSheetModal from '../components/BottomSheetModal';

type NewsScreenProps = {
  standalone?: boolean;
};

function formatDate(value: string, language: AppLanguage) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const locale = getDateLocale(language);
  const diffMs = Date.now() - parsed.getTime();
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < dayMs) {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
      return formatter.format(-minutes, 'minute');
    }

    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return formatter.format(-hours, 'hour');
  }

  const includeYear = parsed.getFullYear() !== new Date().getFullYear();

  return parsed.toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  });
}

function formatMetaLine(
  item: AnnouncementItem,
  language: AppLanguage,
) {
  const authorName = `${item.authorEmployee.firstName} ${item.authorEmployee.lastName}`;
  const relativeOrDate = formatDate(item.createdAt, language);

  return `${relativeOrDate} • ${authorName}`;
}

function UnreadPulseIndicator() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.24, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="relative h-2.5 w-2.5 items-center justify-center">
      <Animated.View
        className="absolute h-2.5 w-2.5 rounded-full bg-[#67b7ff]"
        style={pulseStyle}
      />
      <View className="h-1.5 w-1.5 rounded-full bg-[#1d9bf0]" />
    </View>
  );
}

export default function NewsScreen({ standalone = false }: NewsScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const textDirectionStyle = useMemo(() => getTextDirectionStyle(language), [language]);
  const { roleCodes } = useAuthFlowState();
  const isManager = hasManagerAccess(roleCodes);
  const cacheKey = getNewsScreenCacheKey(isManager);
  const initialSnapshot = useMemo(
    () => peekScreenCache<AnnouncementItem[]>(cacheKey, NEWS_SCREEN_CACHE_TTL_MS),
    [cacheKey],
  );
  const [items, setItems] = useState<AnnouncementItem[]>(initialSnapshot?.value ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [editingPinned, setEditingPinned] = useState(false);
  const announcementTextMap = useLiveTextMap(
    useMemo(
      () => items.flatMap((item) => [item.title, item.body]).filter(Boolean),
      [items],
    ),
    language,
  );

  const copy = useMemo(
    () => ({
      title: t('announcements.title'),
      create: t('announcements.create'),
      empty: t('announcements.empty'),
      loading: t('common.loading'),
      countLabel: (count: number) =>
        t('announcements.countLabel', { count }),
      hide: t('announcements.hide'),
      open: t('common.open'),
      pin: t('announcements.pin'),
      unpin: t('announcements.unpin'),
      edit: t('announcements.edit'),
      remove: t('common.remove'),
      editTitle: t('announcements.editTitle'),
      save: t('announcements.save'),
      cancel: t('common.cancel'),
      deleteConfirmTitle: t('announcements.deleteConfirmTitle'),
      deleteConfirmBody: t('announcements.deleteConfirmBody'),
      saveError: t('announcements.saveError'),
      deleteError: t('announcements.deleteError'),
      titleRequired: t('announcements.titleRequired'),
      bodyRequired: t('announcements.bodyRequired'),
      editorTitlePlaceholder: t('announcements.editorTitlePlaceholder'),
      editorBodyPlaceholder: t('announcements.editorBodyPlaceholder'),
    }),
    [t],
  );

  function translateAnnouncementText(text: string) {
    if (!text) {
      return text;
    }

    const normalized = text.trim();
    const translated = announcementTextMap[normalized] ?? text;

    if (shouldHideTranslatedSourceText(normalized, language)) {
      if (!hasResolvedLiveText(language, normalized)) {
        return '';
      }

      if (translated.trim() === normalized) {
        return '';
      }
    }

    return translated;
  }

  const orderedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      if (!isManager && left.isRead !== right.isRead) {
        return left.isRead ? 1 : -1;
      }

      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [isManager, items]);
  const isEmptyState = !loading && !error && orderedItems.length === 0;

  async function loadData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const nextItems = isManager
        ? await loadManagerAnnouncements()
        : await loadMyAnnouncements();
      await primeLiveTextMap(
        nextItems.flatMap((item) => [item.title, item.body]).filter(Boolean),
        language,
      );
      setItems(nextItems);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('announcements.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return subscribeScreenCache<AnnouncementItem[]>(cacheKey, (entry) => {
      if (!entry) {
        return;
      }

      void primeLiveTextMap(
        entry.value.flatMap((item) => [item.title, item.body]).filter(Boolean),
        language,
      ).catch(() => undefined);
      setItems(entry.value);
      setLoading(false);
    });
  }, [cacheKey, language]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached = await readScreenCache<AnnouncementItem[]>(
        cacheKey,
        NEWS_SCREEN_CACHE_TTL_MS,
      );

      if (cached && !cancelled) {
        void primeLiveTextMap(
          cached.value.flatMap((item) => [item.title, item.body]).filter(Boolean),
          language,
        ).catch(() => undefined);
        setItems(cached.value);
        setLoading(false);
        if (!cached.isStale) {
          return;
        }
      }

      await loadData({ silent: Boolean(cached) });
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, isManager, language]);

  useEffect(() => {
    if (loading) {
      return;
    }

    void writeScreenCache(
      cacheKey,
      items,
    );
  }, [cacheKey, items, loading]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    void warmAnnouncementImages(items);
  }, [items]);

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
      Alert.alert(t('common.error'), copy.titleRequired);
      return;
    }

    if (!editingBody.trim()) {
      Alert.alert(t('common.error'), copy.bodyRequired);
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
    <View className={isEmptyState ? 'flex-1 gap-5' : 'gap-5'}>
      <View className="relative min-h-[44px] justify-center px-1">
        <Text className="px-20 text-center text-[30px] text-foreground">
          {copy.title}
        </Text>
        {isManager ? (
          <View className="absolute bottom-0 right-1 top-0 justify-center">
            <Button
              className="rounded-full border-white/80 bg-white/80 px-5"
              label={`+ ${copy.create}`}
              onPress={() => router.push('/manager/create-news')}
              textClassName="text-[13px] tracking-[1.2px]"
              variant="secondary"
            />
          </View>
        ) : null}
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
              const isReadMuted = !isManager && item.isRead && !isExpanded;
              const cardOpacity = shouldMute ? 0.58 : isReadMuted ? 0.62 : 1;

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
                        opacity: cardOpacity,
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
                        <Text className={`text-[13px] font-medium ${isReadMuted ? 'text-[#8ea0b8]' : 'text-[#64748b]'}`}>
                          {formatMetaLine(item, language)}
                        </Text>

                        <View className="flex-row items-start justify-between gap-3">
                          {(() => {
                            const title = translateAnnouncementText(item.title);

                            return title ? (
                              <Text className={`flex-1 text-[20px] font-extrabold ${isReadMuted ? 'text-[#6c7b91]' : 'text-foreground'}`}>
                                {title}
                              </Text>
                            ) : (
                              <View className="mt-1 h-5 flex-1 rounded-full bg-[#e2eaf6]" />
                            );
                          })()}
                          <View className="items-center gap-1">
                            {!isManager && !item.isRead ? <UnreadPulseIndicator /> : <View className="h-2.5 w-2.5" />}
                            <Ionicons
                              className="mt-1"
                              color={isReadMuted ? '#b2bfd0' : '#94a3b8'}
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                            />
                          </View>
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

                              {(() => {
                                const body = translateAnnouncementText(item.body);

                                return body ? (
                                  <Text className={`text-[15px] leading-7 ${isReadMuted ? 'text-[#607086]' : 'text-foreground'}`}>
                                    {body}
                                  </Text>
                                ) : (
                                  <View className="gap-2">
                                    <View className="h-3 rounded-full bg-[#e2eaf6]" style={{ width: '88%' }} />
                                    <View className="h-3 rounded-full bg-[#edf3fb]" style={{ width: '72%' }} />
                                  </View>
                                );
                              })()}

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
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[17px] leading-6 text-[#5f728b]">{copy.empty}</Text>
        </View>
      )}
    </View>
  );

  if (standalone) {
    return (
      <>
        <Screen contentClassName={isEmptyState ? 'flex-grow pb-10 pt-3' : 'pb-10 pt-3'} withGradient>{content}</Screen>
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
              placeholder={copy.editorTitlePlaceholder}
              style={[textDirectionStyle, { paddingHorizontal: 18, paddingVertical: 16 }]}
              value={editingTitle}
            />

            <TextInput
              className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
              multiline
              numberOfLines={8}
              onChangeText={setEditingBody}
              placeholder={copy.editorBodyPlaceholder}
              style={textDirectionStyle}
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
          flexGrow: 1,
          paddingBottom: 124,
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {content}
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
            placeholder={copy.editorTitlePlaceholder}
            style={[textDirectionStyle, { paddingHorizontal: 18, paddingVertical: 16 }]}
            value={editingTitle}
          />

          <TextInput
            className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
            multiline
            numberOfLines={8}
            onChangeText={setEditingBody}
            placeholder={copy.editorBodyPlaceholder}
            style={textDirectionStyle}
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

