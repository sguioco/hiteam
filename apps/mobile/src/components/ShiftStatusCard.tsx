import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui/text';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { AttendanceStatusResponse } from '@smart/types';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useBannerTheme } from '../../lib/banner-theme';
import { type AppLanguage, useI18n, pluralizeRu } from '../../lib/i18n';
import { PressableScale } from '../../components/ui/pressable-scale';

const HERO_BANNER_VIDEO_SOURCE =
  Platform.OS === 'ios' ? require('../../hero.mp4') : require('../../hero.webm');

type ShiftStatusCardProps = {
  greetingName?: string | null;
  status: AttendanceStatusResponse | null;
  displayTimeZone?: string | null;
  loading?: boolean;
  topInset?: number;
  onPrimaryAction?: () => void;
};

type DurationGrammarCase = 'nominative' | 'accusative';

function ShiftBannerVideoBackdrop({ onReady }: { onReady: () => void }) {
  const player = useVideoPlayer(HERO_BANNER_VIDEO_SOURCE, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
    nextPlayer.audioMixingMode = 'mixWithOthers';
    nextPlayer.play();
  });

  useEffect(() => {
    player.play();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        player.play();
        return;
      }

      player.pause();
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [player]);

  return (
    <VideoView
      allowsVideoFrameAnalysis={false}
      contentFit="cover"
      nativeControls={false}
      onFirstFrameRender={() => {
        onReady();
        player.play();
      }}
      player={player}
      surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
      style={[
        StyleSheet.absoluteFillObject,
        {
          transform: [{ scaleY: -1 }, { scale: 1.08 }],
        },
      ]}
    />
  );
}

function formatDurationPart(
  value: number,
  unit: 'day' | 'hour' | 'minute',
  language: AppLanguage,
  grammarCase: DurationGrammarCase = 'nominative',
) {
  if (language === 'ru') {
    const labels =
      unit === 'day'
        ? (['день', 'дня', 'дней'] as const)
        : unit === 'hour'
          ? (['час', 'часа', 'часов'] as const)
          : grammarCase === 'accusative'
            ? (['минуту', 'минуты', 'минут'] as const)
            : (['минута', 'минуты', 'минут'] as const);

    return `${value} ${pluralizeRu(value, labels)}`;
  }

  const label =
    unit === 'day'
      ? value === 1
        ? 'day'
        : 'days'
      : unit === 'hour'
        ? value === 1
          ? 'hour'
          : 'hours'
        : value === 1
          ? 'minute'
          : 'minutes';

  return `${value} ${label}`;
}

function formatDuration(
  totalMinutes: number,
  language: AppLanguage,
  grammarCase: DurationGrammarCase = 'nominative',
) {
  const safeMinutes = Math.max(Math.ceil(totalMinutes), 0);
  if (safeMinutes === 0) {
    return language === 'ru' ? 'меньше минуты' : 'less than a minute';
  }

  const days = Math.floor(safeMinutes / (24 * 60));
  const hours = Math.floor((safeMinutes % (24 * 60)) / 60);
  const minutes = safeMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(formatDurationPart(days, 'day', language, grammarCase));
  }

  if (hours > 0) {
    parts.push(formatDurationPart(hours, 'hour', language, grammarCase));
  }

  if (days === 0 && minutes > 0) {
    parts.push(formatDurationPart(minutes, 'minute', language, grammarCase));
  }

  if (parts.length === 0) {
    return formatDurationPart(minutes, 'minute', language, grammarCase);
  }

  return parts.slice(0, 2).join(' ');
}

const RU_WEEKDAY_SHORT = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'] as const;
const EN_WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatClockTime(
  value: string,
  locale: string,
  timeZone?: string | null,
) {
  return new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

function formatNextShiftHint(
  nextShift: AttendanceStatusResponse['nextShift'],
  now: Date,
  language: AppLanguage,
  locale: string,
  timeZone?: string | null,
) {
  if (!nextShift) {
    return null;
  }

  const nextShiftStart = new Date(nextShift.startsAt);
  if (Number.isNaN(nextShiftStart.getTime())) {
    return null;
  }

  const timeLabel = formatClockTime(nextShift.startsAt, locale, timeZone);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameCalendarDay(nextShiftStart, now)) {
    return language === 'ru'
      ? `Следующая: сегодня в ${timeLabel}`
      : `Next: today at ${timeLabel}`;
  }

  if (isSameCalendarDay(nextShiftStart, tomorrow)) {
    return language === 'ru'
      ? `Следующая: завтра в ${timeLabel}`
      : `Next: tomorrow at ${timeLabel}`;
  }

  const weekdayLabel =
    language === 'ru'
      ? RU_WEEKDAY_SHORT[nextShiftStart.getDay()]
      : EN_WEEKDAY_SHORT[nextShiftStart.getDay()];

  return language === 'ru'
    ? `Следующая: ${weekdayLabel} в ${timeLabel}`
    : `Next: ${weekdayLabel} at ${timeLabel}`;
}

const ShiftStatusCard = ({
  greetingName,
  status,
  displayTimeZone,
  loading = false,
  onPrimaryAction,
  topInset = 0,
}: ShiftStatusCardProps) => {
  const { language, t } = useI18n();
  const { config: bannerTheme } = useBannerTheme();
  const [videoReady, setVideoReady] = useState(false);
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const shouldRenderBannerVideo = Platform.OS !== 'web';
  const bannerMaskOpacity = videoReady ? bannerTheme.maskOpacity : bannerTheme.fallbackOpacity;
  const textGlow = {
    textShadowColor: 'rgba(14, 20, 34, 0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  } as const;
  const greetingStyle = {
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.45,
  } as const;
  const shiftTimeStyle = {
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.65,
  } as const;
  const shiftLabelStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.16,
  } as const;
  const statusTextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.08,
  } as const;
  const buttonLabelStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.1,
  } as const;
  const pulse = useSharedValue(0.2);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.28 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.7 }],
  }));

  const shiftMeta = useMemo(() => {
    const now = new Date();
    const nextCheckInShift = status?.shift ?? status?.nextShift ?? null;
    const nextCheckInShiftStart = nextCheckInShift
      ? new Date(nextCheckInShift.startsAt)
      : null;
    const canCheckIn =
      status?.attendanceState === 'not_checked_in' &&
      status.allowedActions.includes('check_in') &&
      Boolean(
        nextCheckInShiftStart &&
          !Number.isNaN(nextCheckInShiftStart.getTime()) &&
          now.getTime() >= nextCheckInShiftStart.getTime() - 2 * 60 * 60 * 1000,
      );

    if (loading) {
      return {
        title: t('today.cardLoadingTitle'),
        body: t('today.cardLoadingBody'),
        timing: '',
        locationLabel: status?.location.name ?? '—',
        statusText: '',
        statusColor: '#dbeafe',
        statusIcon: 'time-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: null,
        buttonTone: 'neutral' as const,
      };
    }

    if (!status?.shift) {
      if (status?.nextShift) {
        const nextShiftStart = new Date(status.nextShift.startsAt);
        const nextShiftEnd = new Date(status.nextShift.endsAt);
        const minutesBeforeStart = Math.max(0, (nextShiftStart.getTime() - now.getTime()) / 60000);

        return {
          title: null,
          body: '',
          timing: `${formatClockTime(status.nextShift.startsAt, locale, displayTimeZone)} - ${formatClockTime(status.nextShift.endsAt, locale, displayTimeZone)}`,
          locationLabel: status.nextShift.locationName,
          statusText: t('today.startsIn', {
            duration: formatDuration(minutesBeforeStart, language, 'accusative'),
          }),
          statusColor: '#86efac',
          statusIcon: 'time-outline' as const,
          statusVariant: 'default' as const,
          buttonLabel: canCheckIn ? t('workspace.checkIn') : null,
          buttonTone: canCheckIn ? ('success' as const) : ('neutral' as const),
        };
      }

      return {
        title: null,
        body: '',
        timing: '—',
        locationLabel: status?.location.name ?? '—',
        statusText: t('today.shiftUnassignedTitle'),
        statusColor: '#fef3c7',
        statusIcon: 'calendar-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: canCheckIn ? t('workspace.checkIn') : null,
        buttonTone: canCheckIn ? ('success' as const) : ('neutral' as const),
      };
    }

    const shiftStart = new Date(status.shift.startsAt);
    const shiftEnd = new Date(status.shift.endsAt);
    const timing = `${formatClockTime(status.shift.startsAt, locale, displayTimeZone)} - ${formatClockTime(status.shift.endsAt, locale, displayTimeZone)}`;

    if (status.attendanceState === 'checked_in') {
      const endMinutes = Math.max(0, (shiftEnd.getTime() - now.getTime()) / 60000);
      return {
        title: t('today.cardCheckedInTitle'),
        body: t('today.cardCheckedInBody'),
        timing,
        locationLabel: status.location.name,
        statusText: t('today.onShiftLeft', { duration: formatDuration(endMinutes, language) }),
        statusColor: '#86efac',
        statusIcon: 'checkmark-circle' as const,
        statusVariant: 'default' as const,
        buttonLabel: t('workspace.checkOut'),
        buttonTone: 'danger' as const,
      };
    }

    if (status.attendanceState === 'on_break') {
      const breakStartedAt = status.activeSession?.activeBreak?.startedAt ? new Date(status.activeSession.activeBreak.startedAt) : now;
      const breakMinutes = Math.max(0, (now.getTime() - breakStartedAt.getTime()) / 60000);
      return {
        title: t('today.cardBreakTitle'),
        body: t('today.cardBreakBody'),
        timing,
        locationLabel: status.location.name,
        statusText: t('today.onBreakFor', { duration: formatDuration(breakMinutes, language) }),
        statusColor: '#fde68a',
        statusIcon: 'cafe-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: t('workspace.checkOut'),
        buttonTone: 'danger' as const,
      };
    }

    if (status.attendanceState === 'checked_out') {
      const nextShiftHint = formatNextShiftHint(
        status.nextShift,
        now,
        language,
        locale,
        displayTimeZone,
      );

      return {
        title: t('today.cardCheckedOutTitle'),
        body: t('today.cardCheckedOutBody'),
        timing,
        locationLabel: status.location.name,
        statusText: nextShiftHint
          ? `${t('today.shiftComplete')} • ${nextShiftHint}`
          : t('today.shiftComplete'),
        statusColor: '#cbd5e1',
        statusIcon: 'moon-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: null,
        buttonTone: 'neutral' as const,
      };
    }

    if (now < shiftStart) {
      const minutesBeforeStart = Math.max(0, (shiftStart.getTime() - now.getTime()) / 60000);
      return {
        title: t('today.cardReadyTitle'),
        body: t('today.cardReadyBody'),
        timing,
        locationLabel: status.location.name,
        statusText: t('today.startsIn', {
          duration: formatDuration(minutesBeforeStart, language, 'accusative'),
        }),
        statusColor: '#86efac',
        statusIcon: 'time-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: canCheckIn ? t('workspace.checkIn') : null,
        buttonTone: canCheckIn ? ('success' as const) : ('neutral' as const),
      };
    }

    if (now <= shiftEnd) {
      const lateMinutes = Math.max(0, (now.getTime() - shiftStart.getTime()) / 60000);
      return {
        title: t('today.cardLateTitle'),
        body: t('today.cardLateBody'),
        timing,
        locationLabel: status.location.name,
        statusText: t('today.lateBy', { duration: formatDuration(lateMinutes, language) }),
        statusColor: '#fb7185',
        statusIcon: 'alert-circle-outline' as const,
        statusVariant: 'late' as const,
        buttonLabel: canCheckIn ? t('workspace.checkIn') : null,
        buttonTone: canCheckIn ? ('success' as const) : ('neutral' as const),
      };
    }

    const endedMinutes = Math.max(0, (now.getTime() - shiftEnd.getTime()) / 60000);
    return {
      title: t('today.cardMissedTitle'),
      body: t('today.cardMissedBody'),
      timing,
      locationLabel: status.location.name,
      statusText: t('today.endedAgo', { duration: formatDuration(endedMinutes, language) }),
      statusColor: '#cbd5e1',
      statusIcon: 'moon-outline' as const,
      statusVariant: 'default' as const,
      buttonLabel: null,
      buttonTone: 'neutral' as const,
    };
  }, [displayTimeZone, language, loading, locale, status, t]);

  const buttonClasses =
    shiftMeta.buttonTone === 'danger'
      ? 'border border-white/75 bg-[#546cf2]'
      : shiftMeta.buttonTone === 'success'
        ? 'bg-white/92'
        : 'bg-[#dff8d8]';

  const buttonInnerClasses =
    shiftMeta.buttonTone === 'danger'
      ? 'bg-[#6f84ff]'
      : shiftMeta.buttonTone === 'success'
        ? 'bg-white'
        : 'bg-[#f4fff1]';

  const buttonOverlayClasses =
    shiftMeta.buttonTone === 'danger'
      ? 'bg-[#3144a8]/18'
      : shiftMeta.buttonTone === 'success'
        ? 'bg-[#f3f7ff]/96'
        : 'bg-[#7ee787]/28';

  const buttonTextColor = shiftMeta.buttonTone === 'danger' ? 'text-white' : 'text-[#1e3358]';
  const greetingLabel = greetingName?.trim() ? t('today.greetingWithName', { name: greetingName.trim() }) : t('today.greetingCard');
  const showCardPlaceholder = loading && !status;

  return (
    <View className="relative overflow-hidden rounded-b-[34px] border-x border-b border-white/70 bg-white/80 shadow-lg shadow-[#1f2687]/12">
      <View className="absolute inset-0">
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: '#05070c',
            },
          ]}
        />
        {shouldRenderBannerVideo ? (
          <View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: videoReady ? 1 : 0,
            }}
          >
            <ShiftBannerVideoBackdrop onReady={() => setVideoReady(true)} />
          </View>
        ) : null}
        {shouldRenderBannerVideo ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: bannerTheme.maskColor,
                opacity: bannerMaskOpacity,
              },
            ]}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: bannerTheme.maskColor,
                opacity: bannerTheme.fallbackOpacity,
              },
            ]}
          />
        )}
      </View>
      <View className="absolute inset-0 bg-[#140d2f]/18" />
      <View className="absolute inset-x-0 bottom-0 h-44 bg-[#120a28]/24" />
      <View className="absolute inset-[1px] rounded-[33px] bg-white/4" />

      <View className="relative z-10 justify-between px-7 pb-6" style={{ minHeight: 280 + topInset, paddingTop: topInset + 14 }}>
        <View className="gap-2">
          <Text className="text-[34px] leading-[42px] text-white" style={[textGlow, greetingStyle]}>
            {greetingLabel}
          </Text>
        </View>

        <View className="mt-10">
          <Text className="text-[18px] text-[#f3ecff]" style={[textGlow, shiftLabelStyle]}>
            {t('today.shiftTiming')}
          </Text>
          {showCardPlaceholder ? (
            <View className="mt-3 gap-3">
              <View className="h-11 w-40 rounded-full bg-white/18" />
              <View className="h-4 w-32 rounded-full bg-white/14" />
            </View>
          ) : (
            <>
              <Text className="mt-1 text-[40px] leading-[46px] text-white" style={[textGlow, shiftTimeStyle]}>
                {shiftMeta.timing}
              </Text>
              {shiftMeta.statusVariant === 'late' ? (
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="relative h-2.5 w-2.5 items-center justify-center">
                    <Animated.View className="absolute h-2.5 w-2.5 rounded-full bg-[#ff5b6d]" style={pulseStyle} />
                    <View className="h-2.5 w-2.5 rounded-full bg-[#ff4d63]" />
                  </View>
                  <Text className="text-[14px] leading-[18px] text-white" style={[textGlow, statusTextStyle]}>
                    {shiftMeta.statusText}
                  </Text>
                </View>
              ) : (
                <View className="mt-2 flex-row items-center gap-2">
                  <Ionicons color={shiftMeta.statusColor} name={shiftMeta.statusIcon} size={16} />
                  <Text className="text-[16px] leading-[21px]" style={[statusTextStyle, { color: shiftMeta.statusColor }]}>
                    {shiftMeta.statusText}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {shiftMeta.buttonLabel && !showCardPlaceholder ? (
          <View className="mt-4">
            <PressableScale className={`w-full overflow-hidden rounded-[24px] shadow-lg ${buttonClasses}`} haptic="success" onPress={onPrimaryAction}>
              <View className={buttonInnerClasses}>
                <View className={`px-4 py-4 ${buttonOverlayClasses}`}>
                  <View className="max-w-full flex-row items-center justify-center gap-2 px-2">
                    <Text className="text-base">{shiftMeta.buttonLabel === t('workspace.checkIn') ? '\u{1F44B}' : '\u{1F44B}'}</Text>
                    <Text
                      adjustsFontSizeToFit
                      className={`min-w-0 flex-shrink text-base ${buttonTextColor}`}
                      ellipsizeMode="clip"
                      minimumFontScale={0.62}
                      numberOfLines={1}
                      style={buttonLabelStyle}
                    >
                      {shiftMeta.buttonLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </PressableScale>
          </View>
        ) : null}

      </View>
    </View>
  );
};

export default ShiftStatusCard;

