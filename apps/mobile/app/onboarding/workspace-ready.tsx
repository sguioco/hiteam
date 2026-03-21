import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { bootstrapDemoDevice, loadAttendanceStatus, loadMyShifts } from '../../lib/api';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { capturePreciseAttendanceLocation, isPreciseLocationError } from '../../lib/location';

type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];

export default function WorkspaceReadyOnboardingScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const copy =
    language === 'ru'
      ? {
          eyebrow: 'Первый вход',
          title: 'Рабочее место готово',
          subtitle: 'Лицо настроено. Осталось подтвердить местоположение и проверить назначенную смену.',
          locationTitle: 'Подтвердите офис',
          locationBody: 'Эта проверка нужна только на первом входе после подтверждения профиля.',
          locationButton: 'Подтвердить местоположение',
          locationDone: 'Местоположение подтверждено',
          locationSuccess: 'Вы находитесь в рабочем радиусе. Можно продолжать.',
          permissionRequired: 'Нужно разрешение на геолокацию.',
          preciseRequired: 'Включите точное местоположение.',
          lowAccuracy: 'Точность слишком низкая. Попробуйте еще раз рядом с окном.',
          genericLocationError: 'Не удалось проверить местоположение.',
          todayShift: 'Сегодняшняя смена',
          upcomingDays: 'Ближайшие рабочие дни',
          noShift: 'Смена еще не назначена. Менеджер сможет назначить ее позже.',
          finish: 'Открыть рабочий экран',
        }
      : {
          eyebrow: 'First access',
          title: 'Workspace is ready',
          subtitle: 'Face setup is complete. Verify your location and review the assigned shift.',
          locationTitle: 'Confirm the office',
          locationBody: 'This check is required only on the first mobile sign-in after profile approval.',
          locationButton: 'Verify location',
          locationDone: 'Location confirmed',
          locationSuccess: 'You are inside the work radius. You can continue.',
          permissionRequired: 'Location permission is required.',
          preciseRequired: 'Enable precise location.',
          lowAccuracy: 'Location accuracy is too low. Try again near a window.',
          genericLocationError: 'Unable to verify location.',
          todayShift: 'Today shift',
          upcomingDays: 'Upcoming workdays',
          noShift: 'No shift is assigned yet. The manager can assign it later.',
          finish: 'Open workspace',
        };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loadAttendanceStatus>> | null>(null);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        await bootstrapDemoDevice();
        const [attendance, myShifts] = await Promise.all([loadAttendanceStatus(), loadMyShifts()]);

        if (cancelled) {
          return;
        }

        setStatus(attendance);
        setShifts(myShifts);
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

  const upcomingShifts = useMemo(() => {
    const now = Date.now();
    return shifts
      .filter((shift) => new Date(shift.endsAt).getTime() >= now)
      .slice(0, 4);
  }, [shifts]);

  async function handleVerifyLocation() {
    setError(null);

    try {
      await capturePreciseAttendanceLocation();
      setLocationConfirmed(true);
    } catch (nextError) {
      if (isPreciseLocationError(nextError)) {
        if (nextError.code === 'LOCATION_PERMISSION_REQUIRED') {
          setError(copy.permissionRequired);
          return;
        }

        if (nextError.code === 'PRECISE_LOCATION_REQUIRED') {
          setError(copy.preciseRequired);
          return;
        }

        if (nextError.code === 'LOCATION_ACCURACY_TOO_LOW') {
          setError(copy.lowAccuracy);
          return;
        }
      }

      setError(nextError instanceof Error ? nextError.message : copy.genericLocationError);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="dark" />
        <Text className="text-[16px] font-semibold text-muted">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas px-5 py-6">
      <StatusBar style="dark" />

      <View className="flex-1 gap-5">
        <Card className="gap-4 rounded-[32px] bg-white">
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#60708a]">{copy.eyebrow}</Text>
          <Text className="text-[30px] font-extrabold text-foreground">{copy.title}</Text>
          <Text className="text-[15px] leading-6 text-muted">{copy.subtitle}</Text>
        </Card>

        <Card className="gap-4 rounded-[32px] bg-white">
          <Text className="text-[22px] font-extrabold text-foreground">{copy.locationTitle}</Text>
          <Text className="text-[15px] leading-6 text-muted">{copy.locationBody}</Text>
          <Button
            fullWidth
            label={locationConfirmed ? copy.locationDone : copy.locationButton}
            onPress={() => void handleVerifyLocation()}
            variant={locationConfirmed ? 'secondary' : 'primary'}
          />
          {locationConfirmed ? <Text className="text-[14px] leading-6 text-[#546cf2]">{copy.locationSuccess}</Text> : null}
          {error ? <Text className="text-[14px] leading-6 text-danger">{error}</Text> : null}
        </Card>

        <Card className="gap-4 rounded-[32px] bg-white">
          <Text className="text-[22px] font-extrabold text-foreground">{copy.todayShift}</Text>
          {status?.shift ? (
            <View className="gap-2">
              <Text className="text-[17px] font-semibold text-foreground">{status.shift.label}</Text>
              <Text className="text-[15px] leading-6 text-muted">
                {new Date(status.shift.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - {new Date(status.shift.endsAt).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text className="text-[15px] leading-6 text-muted">{status.location.name}</Text>
            </View>
          ) : (
            <Text className="text-[15px] leading-6 text-muted">{copy.noShift}</Text>
          )}
        </Card>

        <Card className="gap-3 rounded-[32px] bg-white">
          <Text className="text-[22px] font-extrabold text-foreground">{copy.upcomingDays}</Text>
          {upcomingShifts.length > 0 ? (
            upcomingShifts.map((shift) => (
              <View className="rounded-[22px] border border-[#e6ebf5] bg-[#f8faff] px-4 py-3" key={shift.id}>
                <Text className="text-[15px] font-semibold text-foreground">{shift.template.name}</Text>
                <Text className="mt-1 text-[14px] leading-5 text-muted">
                  {new Date(shift.shiftDate).toLocaleDateString(locale)} · {new Date(shift.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endsAt).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text className="mt-1 text-[14px] leading-5 text-muted">{shift.location.name}</Text>
              </View>
            ))
          ) : (
            <Text className="text-[15px] leading-6 text-muted">{copy.noShift}</Text>
          )}
        </Card>

        <View className="mt-auto">
          <Button disabled={!locationConfirmed} fullWidth label={copy.finish} onPress={() => router.replace('/today' as never)} size="lg" />
        </View>
      </View>
    </SafeAreaView>
  );
}
