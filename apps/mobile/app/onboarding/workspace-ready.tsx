import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Card } from '../../components/ui/card';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Screen } from '../../components/ui/screen';
import { BrandWordmark } from '../../src/components/brand-wordmark';
import { loadMyShifts } from '../../lib/api';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { getPreciseLocationAccessStatus, type PreciseLocationAccessStatus } from '../../lib/location';
import { markLocationOnboardingComplete } from '../../lib/onboarding';

type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];

export default function WorkspaceReadyOnboardingScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const isIos = Platform.OS === 'ios';
  const weekdayLabels = language === 'ru' ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const copy =
    language === 'ru'
      ? {
          title: 'Разрешите геолокацию',
          locationTitle: 'Подтвердите настройки локации',
          locationStatusMissing: isIos ? 'Точная геопозиция не включена' : 'Precise location не включена',
          locationStatusImprecise: isIos ? 'Включите точную геопозицию' : 'Включите Precise location',
          locationStatusReady: isIos ? 'Точная геопозиция включена' : 'Precise location включена',
          locationBodyMissing: isIos
            ? 'Откройте настройки приложения, разрешите доступ к геопозиции и включите «Точная геопозиция».'
            : 'Откройте настройки приложения, разрешите доступ к геолокации и включите точную локацию вместо приблизительной.',
          locationBodyImprecise: isIos
            ? 'Доступ к геопозиции уже есть, но «Точная геопозиция» ещё выключена.'
            : 'Доступ к геолокации уже есть, но приложение получает только приблизительную локацию.',
          locationBodyReady: isIos
            ? 'Приложение уже получает точную геопозицию. Можно продолжать.'
            : 'Приложение уже получает точную локацию. Можно продолжать.',
          openSettings: 'Открыть настройки',
          permissionRequired: 'Пока точная геолокация не предоставлена, продолжить нельзя.',
          upcomingDays: 'Ваше расписание',
          noShift: 'Смена пока не назначена.',
          workingHours: 'Рабочее время',
          finish: 'Приступить',
        }
      : {
          title: 'Allow location access',
          locationTitle: 'Confirm location settings',
          locationStatusMissing: isIos ? 'Precise Location is off' : 'Precise location not detected',
          locationStatusImprecise: isIos ? 'Enable Precise Location' : 'Precise location not detected',
          locationStatusReady: isIos ? 'Precise Location is enabled' : 'Precise location is enabled',
          locationBodyMissing: isIos
            ? 'Open the app settings, allow location access, and enable Precise Location.'
            : 'Open the app settings, allow location access, and enable Precise Location',
          locationBodyImprecise: isIos
            ? 'Location access exists, but Precise Location is still disabled.'
            : 'Location access exists, but the app still receives only an approximate or stale location on Android.',
          locationBodyReady: isIos
            ? 'The app already has access to Precise Location. You can continue.'
            : 'The app already has access to precise location. You can continue.',
          openSettings: 'Open settings',
          permissionRequired: 'Continue stays locked until precise location access is enabled.',
          upcomingDays: 'Your schedule',
          noShift: 'No shift assigned yet.',
          workingHours: 'Working hours',
          finish: 'Continue',
        };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<PreciseLocationAccessStatus>({
    status: 'missing',
    accuracyMeters: null,
  });
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const appStateRef = useRef(AppState.currentState);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoForwardedRef = useRef(false);

  const titleStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_700Bold',
    fontSize: 34,
    includeFontPadding: false,
    lineHeight: 38,
  } as const;

  const headingStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    includeFontPadding: false,
    lineHeight: 32,
  } as const;

  const bodyStyle = {
    color: '#6f7892',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;

  const metaLabelStyle = {
    color: '#7a8094',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    includeFontPadding: false,
    letterSpacing: 1.2,
    lineHeight: 18,
    textTransform: 'uppercase',
  } as const;

  const actionLabelStyle = {
    color: '#f7f1e6',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;

  const errorStyle = {
    color: '#b93b4a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 22,
  } as const;

  const statusPillStyle = {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    includeFontPadding: false,
    lineHeight: 28,
    fontWeight: Platform.OS === 'android' ? '600' : '400',
  } as const;

  async function syncLocationPermission() {
    setLocationStatus(await getPreciseLocationAccessStatus());
  }

  function scheduleLocationRefresh() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    void syncLocationPermission();

    refreshTimerRef.current = setTimeout(() => {
      void syncLocationPermission();
      refreshTimerRef.current = null;
    }, 450);
  }

  function startBackgroundLocationPolling() {
    if (pollIntervalRef.current) {
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        void syncLocationPermission();
      }
    }, 1200);
  }

  function stopBackgroundLocationPolling() {
    if (!pollIntervalRef.current) {
      return;
    }

    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const myShifts = await loadMyShifts();
        const nextLocationStatus = await getPreciseLocationAccessStatus();

        if (cancelled) {
          return;
        }

        setShifts(myShifts);
        setLocationStatus(nextLocationStatus);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('today.loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      if (state === 'active') {
        scheduleLocationRefresh();
        setTimeout(() => {
          if (appStateRef.current === 'active') {
            void syncLocationPermission();
          }
        }, 1200);
        setTimeout(() => {
          if (appStateRef.current === 'active') {
            void syncLocationPermission();
          }
        }, 2400);
      }
    });

    return () => {
      subscription.remove();
      stopBackgroundLocationPolling();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (loading || locationStatus.status === 'ready') {
      stopBackgroundLocationPolling();
      return;
    }

    startBackgroundLocationPolling();

    return () => {
      stopBackgroundLocationPolling();
    };
  }, [loading, locationStatus.status]);

  // Removed auto-forwarding so the user must click "Continue" manually.
  const scheduleSummary = useMemo(() => {
    if (shifts.length === 0) {
      return null;
    }

    const activeWeekdays = new Set<number>();
    const timeRanges = new Map<string, number>();

    for (const shift of shifts) {
      const day = new Date(shift.shiftDate).getDay();
      const mondayFirstIndex = day === 0 ? 6 : day - 1;
      activeWeekdays.add(mondayFirstIndex);

      const startsAt = new Date(shift.startsAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
      const endsAt = new Date(shift.endsAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
      const rangeKey = `${startsAt} - ${endsAt}`;
      timeRanges.set(rangeKey, (timeRanges.get(rangeKey) ?? 0) + 1);
    }

    const dominantRange =
      Array.from(timeRanges.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

    return {
      activeWeekdays,
      dominantRange,
    };
  }, [locale, shifts]);

  async function handleVerifyLocation() {
    setError(null);

    try {
      await Linking.openSettings();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.permissionRequired);
    }
  }

  async function handleFinish() {
    try {
      if (locationStatus.status !== 'ready') {
        setError(copy.permissionRequired);
        return;
      }
      await markLocationOnboardingComplete();
      router.replace('/today' as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.permissionRequired);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <StatusBar style="dark" />
        <Text style={bodyStyle}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <Screen contentClassName="gap-6 px-6 pb-8 pt-6" safeAreaClassName="bg-white" showsVerticalScrollIndicator={false}>
      <StatusBar style="dark" />

      <View className="gap-4">
        <BrandWordmark className="text-center text-[46px] leading-[50px] text-[#26334a]" />
        <View className="mt-10 gap-2">
          <Text style={[titleStyle, { textAlign: 'center' }]}>
            <Text style={{ fontFamily: 'Manrope_700Bold' }}>
              {copy.title.split(' ')[0]}
            </Text>
            <Text style={{ fontFamily: 'Manrope_700Bold' }}>
              {' '}
              {copy.title.split(' ').slice(1).join(' ')}
            </Text>
          </Text>
        </View>
      </View>

      <Card className="gap-4 rounded-[30px] bg-white">
        <Text style={[metaLabelStyle, { textAlign: 'center' }]}>{copy.locationTitle}</Text>
        <View className="items-center gap-3 px-2">
          <Text
            style={[
              statusPillStyle,
              {
                color: locationStatus.status === 'ready' ? '#1f9d55' : '#c43d4b',
                maxWidth: 320,
                textAlign: 'center',
              },
            ]}
          >
            {locationStatus.status === 'ready'
              ? copy.locationStatusReady
              : locationStatus.status === 'imprecise'
                ? copy.locationStatusImprecise
                : copy.locationStatusMissing}
          </Text>
          <Text style={[bodyStyle, { maxWidth: 320, textAlign: 'center' }]}>
            {locationStatus.status === 'ready'
              ? copy.locationBodyReady
              : locationStatus.status === 'imprecise'
                ? copy.locationBodyImprecise
                : copy.locationBodyMissing}
          </Text>
        </View>
        {locationStatus.status === 'ready' ? null : (
          <PressableScale
            className="min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
            haptic="medium"
            onPress={() => void handleVerifyLocation()}
          >
            <Text style={actionLabelStyle}>{copy.openSettings}</Text>
          </PressableScale>
        )}
        {error ? <Text style={[errorStyle, { textAlign: 'center' }]}>{error}</Text> : null}
      </Card>

      <Card className="gap-4 rounded-[30px] bg-white">
        <Text style={[headingStyle, { textAlign: 'center' }]}>{copy.upcomingDays}</Text>
        {scheduleSummary ? (
          <View className="gap-4">
            <View>
              <Text style={[metaLabelStyle, { textAlign: 'center' }]}>{copy.workingHours}</Text>
              <Text
                className="mt-2"
                style={{
                  color: '#26334a',
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 24,
                  includeFontPadding: false,
                  lineHeight: 28,
                  textAlign: 'center',
                }}
              >
                {scheduleSummary.dominantRange}
              </Text>
            </View>

            <View className="flex-row items-center justify-center gap-1">
              {weekdayLabels.map((label, index) => {
                const isActive = scheduleSummary.activeWeekdays.has(index);
                const isEnglish = language !== 'ru';

                return (
                  <View
                    className={`h-14 w-14 items-center justify-center rounded-full border ${
                      isActive ? 'border-[#546cf2] bg-white' : 'border-[#d6dceb] bg-[#f4f6fb]'
                    }`}
                    key={label}
                  >
                    <Text
                      style={{
                        color: isActive ? '#546cf2' : '#8b94a8',
                        fontFamily: 'Manrope_600SemiBold',
                        fontSize: isEnglish ? 13 : 15,
                        includeFontPadding: false,
                        lineHeight: isEnglish ? 13 : 16,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          ) : (
            <Text style={[bodyStyle, { textAlign: 'center' }]}>{copy.noShift}</Text>
          )}
      </Card>

      <PressableScale
        className={`mt-16 min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
          locationStatus.status === 'ready' ? '' : 'opacity-70'
        }`}
        disabled={locationStatus.status !== 'ready'}
        haptic="medium"
        onPress={() => void handleFinish()}
      >
        <Text style={actionLabelStyle}>{copy.finish}</Text>
      </PressableScale>
    </Screen>
  );
}
