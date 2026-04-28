import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Image, Linking, ScrollView, TextInput, View } from 'react-native';
import { Line, Rect, Svg } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { Text } from '../../components/ui/text';
import Animated, {
  FadeInUp,
  LinearTransition,
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

function localizeText(language: AppLanguage, ru: string, en: string) {
  return language === 'ru' ? ru : en;
}

function normalizeAnnouncementLink(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function formatAttachmentSize(sizeBytes: number | null, language: AppLanguage) {
  if (!sizeBytes || sizeBytes <= 0) {
    return localizeText(language, 'Документ', 'Document');
  }

  if (sizeBytes < 1024 * 1024) {
    const kiloBytes = Math.max(1, Math.round(sizeBytes / 1024));
    return localizeText(language, `${kiloBytes} КБ`, `${kiloBytes} KB`);
  }

  const megaBytes = sizeBytes / (1024 * 1024);
  return localizeText(language, `${megaBytes.toFixed(1)} МБ`, `${megaBytes.toFixed(1)} MB`);
}

function formatAbsoluteDateTime(value: string, language: AppLanguage) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function getAnnouncementDisplayTimestamp(item: Pick<AnnouncementItem, 'createdAt' | 'publishedAt'>) {
  return item.publishedAt ?? item.createdAt;
}

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
    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
      if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-minutes, 'minute');
      }
      return localizeText(language, `${minutes} мин. назад`, `${minutes} min ago`);
    }

    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour');
    }
    return localizeText(language, `${hours} ч. назад`, `${hours}h ago`);
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
  const author = item.authorEmployee;
  const authorName = author
    ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()
    : localizeText(language, 'Команда', 'Team');
  const relativeOrDate = formatDate(getAnnouncementDisplayTimestamp(item), language);

  return [relativeOrDate, authorName].filter(Boolean).join(' • ');
}

function normalizeAnnouncementItems(value: unknown): AnnouncementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AnnouncementItem => {
    return Boolean(
      item &&
        typeof item === 'object' &&
        typeof (item as AnnouncementItem).id === 'string' &&
        typeof (item as AnnouncementItem).title === 'string' &&
        typeof (item as AnnouncementItem).body === 'string',
    );
  });
}

function isValidCoordinate(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

function getAnnouncementImageUrl(item: AnnouncementItem) {
  return typeof item.imageUrl === 'string' && item.imageUrl.trim()
    ? item.imageUrl
    : null;
}

function getAnnouncementLinkUrl(item: AnnouncementItem) {
  return typeof item.linkUrl === 'string' && item.linkUrl.trim()
    ? item.linkUrl
    : null;
}

function getAnnouncementAttachments(item: AnnouncementItem) {
  return Array.isArray(item.attachments)
    ? item.attachments.filter(
        (attachment) =>
          attachment &&
          typeof attachment.id === 'string' &&
          typeof attachment.url === 'string' &&
          typeof attachment.fileName === 'string',
      )
    : [];
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
  const [items, setItems] = useState<AnnouncementItem[]>(
    normalizeAnnouncementItems(initialSnapshot?.value),
  );
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

      return (
        new Date(getAnnouncementDisplayTimestamp(right)).getTime() -
        new Date(getAnnouncementDisplayTimestamp(left)).getTime()
      );
    });
  }, [isManager, items]);
  const isEmptyState = !loading && !error && orderedItems.length === 0;

  async function loadData(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const nextItemsRaw = isManager
        ? await loadManagerAnnouncements()
        : await loadMyAnnouncements();
      const nextItems = normalizeAnnouncementItems(nextItemsRaw);
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

      const cachedItems = normalizeAnnouncementItems(entry.value);
      void primeLiveTextMap(
        cachedItems.flatMap((item) => [item.title, item.body]).filter(Boolean),
        language,
      ).catch(() => undefined);
      setItems(cachedItems);
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
        const cachedItems = normalizeAnnouncementItems(cached.value);
        void primeLiveTextMap(
          cachedItems.flatMap((item) => [item.title, item.body]).filter(Boolean),
          language,
        ).catch(() => undefined);
        setItems(cachedItems);
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
      <View className="min-h-[48px] flex-row items-center justify-between gap-3 px-1">
        <Text className="flex-1 text-left text-[24px] font-extrabold leading-[30px] text-foreground">
          {copy.title}
        </Text>
        {isManager ? (
          <Button
            className="rounded-full border-white/80 bg-white/80 px-4"
            label={`+ ${copy.create}`}
            onPress={() => router.push('/manager/create-news')}
            textClassName="text-[13px] font-semibold"
            variant="secondary"
          />
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
              const imageUrl = getAnnouncementImageUrl(item);
              const linkUrl = getAnnouncementLinkUrl(item);
              const attachments = getAnnouncementAttachments(item);

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

                        {item.scheduledFor && !item.publishedAt ? (
                          <View className="self-start rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1">
                            <Text className="text-[12px] font-semibold text-[#1d4ed8]">
                              {localizeText(language, 'Запланировано', 'Scheduled')}
                            </Text>
                          </View>
                        ) : null}

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
                          <View className="items-center">
                            <Ionicons
                              color={isReadMuted ? '#b2bfd0' : '#94a3b8'}
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                            />
                          </View>
                        </View>

                        {isExpanded ? (
                          <Animated.View layout={LinearTransition.duration(180)}>
                            <View className="gap-4">
                              {item.scheduledFor && !item.publishedAt ? (
                                <View className="rounded-[20px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                                  <Text className="text-[14px] font-semibold text-[#1d4ed8]">
                                    {localizeText(language, 'Публикация запланирована', 'Publication scheduled')}
                                  </Text>
                                  <Text className="mt-1 text-[13px] text-[#1d4ed8]">
                                    {formatAbsoluteDateTime(item.scheduledFor, language)}
                                  </Text>
                                </View>
                              ) : null}

                              {imageUrl ? (
                                <Image
                                  resizeMode="cover"
                                  source={{ uri: imageUrl }}
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

                              {attachments.length ? (
                                <View className="gap-2">
                                  {attachments.map((attachment) => (
                                    <PressableScale
                                      className="rounded-[20px] border border-white/30 bg-[#f8fbff] px-4 py-3 shadow-sm shadow-[#1f2687]/10"
                                      haptic="selection"
                                      key={attachment.id}
                                      onPress={() => void Linking.openURL(attachment.url)}
                                    >
                                      <View className="flex-row items-center justify-between gap-3">
                                        <View className="flex-row items-center gap-3">
                                          <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                                            <Ionicons color="#334155" name="document-outline" size={18} />
                                          </View>
                                          <View className="flex-1">
                                            <Text className="text-[14px] font-semibold text-foreground">
                                              {attachment.fileName}
                                            </Text>
                                            <Text className="mt-1 text-[12px] text-muted-foreground">
                                              {formatAttachmentSize(attachment.sizeBytes, language)}
                                            </Text>
                                          </View>
                                        </View>
                                        <Ionicons color="#64748b" name="open-outline" size={18} />
                                      </View>
                                    </PressableScale>
                                  ))}
                                </View>
                              ) : null}

                              {linkUrl ? (
                                <PressableScale
                                  className="rounded-[20px] border border-white/30 bg-[#f8fbff] px-4 py-3 shadow-sm shadow-[#1f2687]/10"
                                  haptic="selection"
                                  onPress={() => {
                                    const link = normalizeAnnouncementLink(linkUrl);
                                    if (link) {
                                      void Linking.openURL(link);
                                    }
                                  }}
                                >
                                  <View className="flex-row items-center justify-between gap-3">
                                    <View className="flex-row items-center gap-3">
                                      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                                        <Ionicons color="#334155" name="link-outline" size={18} />
                                      </View>
                                      <Text className="flex-1 text-[14px] font-semibold text-foreground">
                                        {linkUrl}
                                      </Text>
                                    </View>
                                    <Ionicons color="#64748b" name="open-outline" size={18} />
                                  </View>
                                </PressableScale>
                              ) : null}

                              {item.attachmentLocation &&
                              isValidCoordinate(
                                item.attachmentLocation.latitude,
                                item.attachmentLocation.longitude,
                              ) ? (
                                <View className="overflow-hidden rounded-[20px] border border-white/30 bg-[#f8fbff] shadow-sm shadow-[#1f2687]/10">
                                  <View className="px-4 py-3">
                                    <Text className="text-[14px] font-semibold text-foreground">
                                      {localizeText(language, 'Геолокация', 'Geolocation')}
                                    </Text>
                                    <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
                                      {item.attachmentLocation.address}
                                    </Text>
                                  </View>
                                  <MapView
                                    initialRegion={{
                                      latitude: item.attachmentLocation.latitude,
                                      longitude: item.attachmentLocation.longitude,
                                      latitudeDelta: 0.01,
                                      longitudeDelta: 0.01,
                                    }}
                                    region={{
                                      latitude: item.attachmentLocation.latitude,
                                      longitude: item.attachmentLocation.longitude,
                                      latitudeDelta: 0.01,
                                      longitudeDelta: 0.01,
                                    }}
                                    pitchEnabled={false}
                                    rotateEnabled={false}
                                    scrollEnabled={false}
                                    style={{ height: 220, width: '100%' }}
                                    zoomEnabled={false}
                                  >
                                    <Marker
                                      coordinate={{
                                        latitude: item.attachmentLocation.latitude,
                                        longitude: item.attachmentLocation.longitude,
                                      }}
                                    />
                                  </MapView>
                                </View>
                              ) : null}

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
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Svg height="54" viewBox="0 0 64 64" width="54">
            <Rect
              x="9"
              y="8"
              fill="none"
              height="44"
              rx="5"
              ry="5"
              stroke="#94a3b8"
              strokeWidth="2.5"
              width="46"
            />
            <Line
              stroke="#94a3b8"
              strokeLinecap="round"
              strokeWidth="2.3"
              x1="16"
              x2="34"
              y1="22"
              y2="22"
            />
            <Line
              stroke="#94a3b8"
              strokeLinecap="round"
              strokeWidth="2.3"
              x1="16"
              x2="34"
              y1="30"
              y2="30"
            />
            <Line
              stroke="#94a3b8"
              strokeLinecap="round"
              strokeWidth="2.3"
              x1="16"
              x2="26"
              y1="38"
              y2="38"
            />
            <Rect
              fill="none"
              height="28"
              rx="4"
              ry="4"
              stroke="#64748b"
              strokeWidth="2"
              width="16"
              x="39"
              y="18"
            />
            <Line
              stroke="#64748b"
              strokeLinecap="round"
              strokeWidth="2.3"
              x1="44"
              x2="49"
              y1="25"
              y2="25"
            />
            <Line
              stroke="#64748b"
              strokeLinecap="round"
              strokeWidth="2.3"
              x1="44"
              x2="49"
              y1="32"
              y2="32"
            />
          </Svg>
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

