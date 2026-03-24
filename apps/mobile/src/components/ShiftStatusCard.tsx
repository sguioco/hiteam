import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ImageBackground, Text, View } from 'react-native';
import type { AttendanceStatusResponse } from '@smart/types';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useI18n } from '../../lib/i18n';
import { PressableScale } from '../../components/ui/pressable-scale';

type ShiftStatusCardProps = {
  greetingName?: string | null;
  status: AttendanceStatusResponse | null;
  loading?: boolean;
  topInset?: number;
  onPrimaryAction?: () => void;
};

function pluralizeRu(value: number, forms: readonly [string, string, string]) {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 19) {
    return forms[2];
  }

  const remainder10 = value % 10;
  if (remainder10 === 1) {
    return forms[0];
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return forms[1];
  }

  return forms[2];
}

function formatDurationPart(value: number, unit: 'day' | 'hour' | 'minute', language: 'ru' | 'en') {
  if (language === 'ru') {
    const labels =
      unit === 'day'
        ? (['день', 'дня', 'дней'] as const)
        : unit === 'hour'
          ? (['час', 'часа', 'часов'] as const)
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

function formatDuration(totalMinutes: number, language: 'ru' | 'en') {
  const safeMinutes = Math.max(Math.ceil(totalMinutes), 0);
  if (safeMinutes === 0) {
    return language === 'ru' ? 'меньше минуты' : 'less than a minute';
  }

  const days = Math.floor(safeMinutes / (24 * 60));
  const hours = Math.floor((safeMinutes % (24 * 60)) / 60);
  const minutes = safeMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(formatDurationPart(days, 'day', language));
  }

  if (hours > 0) {
    parts.push(formatDurationPart(hours, 'hour', language));
  }

  if (days === 0 && minutes > 0) {
    parts.push(formatDurationPart(minutes, 'minute', language));
  }

  if (parts.length === 0) {
    return formatDurationPart(minutes, 'minute', language);
  }

  return parts.slice(0, 2).join(' ');
}

const ShiftStatusCard = ({ greetingName, status, loading = false, onPrimaryAction, topInset = 0 }: ShiftStatusCardProps) => {
  const { language, t } = useI18n();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
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

    if (loading) {
      return {
        title: t('today.cardLoadingTitle'),
        body: t('today.cardLoadingBody'),
        timing: '...',
        locationLabel: status?.location.name ?? '—',
        statusText: t('common.loading'),
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
          timing: `${nextShiftStart.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${nextShiftEnd.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          locationLabel: status.nextShift.locationName,
          statusText: t('today.startsIn', { duration: formatDuration(minutesBeforeStart, language) }),
          statusColor: '#86efac',
          statusIcon: 'time-outline' as const,
          statusVariant: 'default' as const,
          buttonLabel: null,
          buttonTone: 'neutral' as const,
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
        buttonLabel: null,
        buttonTone: 'neutral' as const,
      };
    }

    const shiftStart = new Date(status.shift.startsAt);
    const shiftEnd = new Date(status.shift.endsAt);
    const timing = `${shiftStart.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${shiftEnd.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

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
      return {
        title: t('today.cardCheckedOutTitle'),
        body: t('today.cardCheckedOutBody'),
        timing,
        locationLabel: status.location.name,
        statusText: t('today.shiftComplete'),
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
        statusText: t('today.startsIn', { duration: formatDuration(minutesBeforeStart, language) }),
        statusColor: '#86efac',
        statusIcon: 'time-outline' as const,
        statusVariant: 'default' as const,
        buttonLabel: t('workspace.checkIn'),
        buttonTone: 'success' as const,
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
        buttonLabel: t('workspace.checkIn'),
        buttonTone: 'success' as const,
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
  }, [language, loading, locale, status, t]);

  const buttonClasses =
    shiftMeta.buttonTone === 'danger'
      ? 'bg-[#546cf2]'
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
  const greetingLabel = greetingName?.trim() ? `Hi, ${greetingName.trim()}` : t('today.greetingCard');

  return (
    <View className="relative overflow-hidden rounded-b-[34px] border-x border-b border-white/70 bg-white/80 shadow-lg shadow-[#1f2687]/12">
      <View className="absolute inset-0">
        <ImageBackground className="h-full w-full" resizeMode="cover" source={require('../../bg.webp')} />
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
        </View>

        {shiftMeta.buttonLabel ? (
          <View className="mt-4">
            <PressableScale className={`w-full overflow-hidden rounded-[24px] shadow-lg ${buttonClasses}`} haptic="success" onPress={onPrimaryAction}>
              <View className={buttonInnerClasses}>
                <View className={`px-4 py-4 ${buttonOverlayClasses}`}>
                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-base">{shiftMeta.buttonLabel === t('workspace.checkIn') ? '\u{1F44B}' : '\u{1F44B}'}</Text>
                    <Text className={`text-base ${buttonTextColor}`} style={buttonLabelStyle}>
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
