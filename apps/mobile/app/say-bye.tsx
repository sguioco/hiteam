import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  bootstrapDemoDevice,
  loadAttendanceStatus,
  loadBiometricPolicy,
  submitAttendanceAction,
} from '../lib/api';
import { getDateLocale, useI18n } from '../lib/i18n';
import {
  capturePreciseAttendanceLocation,
  isPreciseLocationError,
  type AttendanceLocationSnapshot,
} from '../lib/location';

type VerificationState = 'idle' | 'running' | 'checked';

export default function SayByeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    biometricVerificationId?: string;
    biometricEnrollmentStatus?: string;
    biometricMessage?: string;
    biometricTick?: string;
  }>();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const copy =
    language === 'ru'
      ? {
          checked: 'Проверено',
          runCheck: 'Проверить',
          locationTitle: 'Местоположение',
          faceTitle: 'Лицо',
          locationPermissionRequired: 'Нужно разрешение на геолокацию.',
          locationPreciseRequired: 'Включите точное местоположение.',
          locationAccuracyTooLow: 'Точность геолокации слишком низкая. Подойдите ближе к окну и попробуйте снова.',
        }
      : {
          checked: 'Checked',
          runCheck: 'Run check',
          locationTitle: 'Location',
          faceTitle: 'Face',
          locationPermissionRequired: 'Location permission is required.',
          locationPreciseRequired: 'Enable precise location to continue.',
          locationAccuracyTooLow: 'Location accuracy is too low. Move closer to a window and try again.',
        };
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loadAttendanceStatus>> | null>(null);
  const [biometricPolicy, setBiometricPolicy] = useState<Awaited<ReturnType<typeof loadBiometricPolicy>> | null>(null);
  const [locationState, setLocationState] = useState<VerificationState>('idle');
  const [faceState, setFaceState] = useState<VerificationState>('idle');
  const [capturedLocation, setCapturedLocation] = useState<AttendanceLocationSnapshot | null>(null);
  const [biometricVerificationId, setBiometricVerificationId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      await bootstrapDemoDevice();
      const [nextStatus, nextBiometricPolicy] = await Promise.all([loadAttendanceStatus(), loadBiometricPolicy()]);

      setStatus(nextStatus);
      setBiometricPolicy(nextBiometricPolicy);
      if (nextStatus.attendanceState === 'not_checked_in' || nextStatus.attendanceState === 'checked_out') {
        router.replace('/today' as never);
        return;
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('departure.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!params.biometricTick) {
      return;
    }

    if (typeof params.biometricVerificationId === 'string' && params.biometricVerificationId) {
      setBiometricVerificationId(params.biometricVerificationId);
      setFaceState('checked');
      setInfoMessage(typeof params.biometricMessage === 'string' ? params.biometricMessage : t('departure.faceVerified'));
      setError(null);
    } else if (params.biometricEnrollmentStatus === 'ENROLLED') {
      setFaceState('idle');
      setBiometricVerificationId(null);
      setInfoMessage(typeof params.biometricMessage === 'string' ? params.biometricMessage : t('departure.faceEnrollComplete'));
      void refresh();
    }

    router.setParams({
      biometricVerificationId: undefined,
      biometricEnrollmentStatus: undefined,
      biometricMessage: undefined,
      biometricTick: undefined,
    });
  }, [
    params.biometricEnrollmentStatus,
    params.biometricMessage,
    params.biometricTick,
    params.biometricVerificationId,
    router,
    t,
  ]);

  const shiftTime = useMemo(() => {
    if (!status?.shift) {
      return '—';
    }

    return `${new Date(status.shift.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${new Date(
      status.shift.endsAt,
    ).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }, [locale, status]);

  const canContinue = Boolean(capturedLocation) && Boolean(biometricVerificationId) && !submitting;
  const faceButtonLabel =
    biometricPolicy?.enrollmentStatus === 'ENROLLED' ? t('biometric.verify') : t('biometric.enroll');

  async function runLocationCheck() {
    setLocationState('running');
    setError(null);
    setInfoMessage(null);

    try {
      const nextLocation = await capturePreciseAttendanceLocation();
      setCapturedLocation(nextLocation);
      setLocationState('checked');
      setInfoMessage(t('departure.locationCaptured', { accuracy: nextLocation.accuracyMeters }));
    } catch (nextError) {
      setLocationState('idle');

      if (isPreciseLocationError(nextError)) {
        if (nextError.code === 'LOCATION_PERMISSION_REQUIRED') {
          setError(copy.locationPermissionRequired);
          return;
        }

        if (nextError.code === 'PRECISE_LOCATION_REQUIRED') {
          setError(copy.locationPreciseRequired);
          return;
        }

        if (nextError.code === 'LOCATION_ACCURACY_TOO_LOW') {
          setError(copy.locationAccuracyTooLow);
          return;
        }
      }

      setError(nextError instanceof Error ? nextError.message : t('departure.locationCaptureFailed'));
    }
  }

  async function runFaceCheck() {
    setError(null);
    setInfoMessage(null);

    if (!biometricPolicy) {
      await refresh();
      return;
    }

    if (biometricPolicy.enrollmentStatus !== 'ENROLLED') {
      setInfoMessage(t('departure.faceEnrollmentRequired'));
      router.push({
        pathname: '/biometric',
        params: {
          mode: 'enroll',
          returnTo: '/say-bye',
        },
      });
      return;
    }

    router.push({
      pathname: '/biometric',
      params: {
        mode: 'verify',
        intent: 'attendance-check-out',
        returnTo: '/say-bye',
      },
    });
  }

  function stepBadge(state: VerificationState) {
    if (state === 'checked') return copy.checked;
    if (state === 'running') return t('common.processing');
    return '';
  }

  async function handleContinue() {
    if (!capturedLocation || !biometricVerificationId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitAttendanceAction('check-out', {
        ...capturedLocation,
        biometricVerificationId,
        notes: 'Mobile attendance check-out',
      });
      router.replace('/today' as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('today.actionError'));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
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

      <View className="flex-1">
        {!started ? (
          <View className="flex-1 justify-between">
            <View className="overflow-hidden rounded-[40px] bg-[#eef4ff] px-6 pb-8 pt-8">
              <View className="absolute -left-14 -top-10 h-44 w-44 rounded-full bg-[#b8d0ff]" />
              <View className="absolute right-8 top-14 h-44 w-44 rounded-full bg-[#d9e7ff]/80" />
              <View className="absolute -right-12 bottom-0 h-56 w-56 rounded-full bg-[#c5d5ff]/70" />

              <Badge label={t('departure.shiftBadge')} className="mb-6 bg-white/70 text-foreground" variant="muted" />

              <Text className="text-[40px] font-extrabold leading-[44px] text-[#24314b]">{t('departure.welcome')}</Text>
              <Text className="mt-4 max-w-[250px] text-[16px] leading-6 text-[#4d5c79]">{t('departure.subtitle')}</Text>

              <View className="mt-10 rounded-[28px] bg-white/72 p-5">
                <Text className="text-[14px] font-bold uppercase tracking-[2px] text-[#66728f]">{t('today.shiftTiming')}</Text>
                <Text className="mt-2 text-[28px] font-extrabold text-[#24314b]">{shiftTime}</Text>
                <Text className="mt-2 text-[15px] text-[#66728f]">{status?.location.name ?? '—'}</Text>
              </View>
            </View>

            <View className="gap-3 pb-2 pt-6">
              <Text className="text-center text-[15px] leading-6 text-muted">{t('departure.sayByeHint')}</Text>
              <Button fullWidth className="min-h-16 rounded-[30px]" label={t('departure.sayBye')} onPress={() => setStarted(true)} size="lg" />
            </View>
          </View>
        ) : (
          <View className="flex-1 gap-5">
            <View className="gap-3">
              <Badge label={t('departure.shiftBadge')} variant="brand" />
              <Text className="text-[32px] font-extrabold text-foreground">{t('departure.verificationTitle')}</Text>
              <Text className="text-[16px] leading-6 text-muted">{t('departure.verificationSubtitle')}</Text>
            </View>

            <Card className="gap-4 rounded-[32px] bg-white/72">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <Text className="text-[22px] font-extrabold text-foreground">{copy.locationTitle}</Text>
                  <Text className="text-[15px] leading-6 text-muted">{t('departure.locationBody')}</Text>
                </View>
                {stepBadge(locationState) ? <Badge label={stepBadge(locationState)} variant={locationState === 'checked' ? 'brand' : 'muted'} /> : null}
              </View>
              <Button label={copy.runCheck} onPress={() => void runLocationCheck()} variant="secondary" />
            </Card>

            <Card className="gap-4 rounded-[32px] bg-white/72">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <Text className="text-[22px] font-extrabold text-foreground">{copy.faceTitle}</Text>
                  <Text className="text-[15px] leading-6 text-muted">{t('departure.faceBody')}</Text>
                </View>
                {stepBadge(faceState) ? <Badge label={stepBadge(faceState)} variant={faceState === 'checked' ? 'brand' : 'muted'} /> : null}
              </View>
              <Button label={faceButtonLabel} onPress={() => void runFaceCheck()} variant="secondary" />
            </Card>

            <Card className="gap-3 rounded-[32px] bg-[#eef2ff]">
              <Text className="text-[18px] font-extrabold text-foreground">{t('departure.readyTitle')}</Text>
              <Text className="text-[15px] leading-6 text-muted">{t('departure.readyBody')}</Text>
            </Card>

            {infoMessage ? <Text className="text-[14px] leading-5 text-muted">{infoMessage}</Text> : null}
            {error ? <Text className="text-[14px] leading-5 text-danger">{error}</Text> : null}

            <View className="mt-auto gap-3 pb-2">
              <Button
                disabled={!canContinue || submitting}
                fullWidth
                className="min-h-16 rounded-[30px]"
                label={submitting ? t('departure.processing') : t('departure.continue')}
                onPress={() => void handleContinue()}
                size="lg"
              />
              <Pressable onPress={() => setStarted(false)}>
                <Text className="text-center text-[15px] font-semibold text-muted">{t('common.back')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
