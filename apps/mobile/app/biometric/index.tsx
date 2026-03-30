import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BiometricJobItem, BiometricPolicyResponse } from '@smart/types';
import { PressableScale } from '../../components/ui/pressable-scale';
import { BrandWordmark } from '../../src/components/brand-wordmark';
import {
  bootstrapDemoDevice,
  completeBiometricEnrollmentWithArtifacts,
  loadBiometricPolicy,
  loadMyBiometricJob,
  queueVerifyBiometricWithArtifacts,
  startBiometricEnrollment,
} from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BiometricPage() {
  const router = useRouter();
  const { language, t } = useI18n();
  const params = useLocalSearchParams<{
    mode?: string;
    intent?: string;
    returnTo?: string;
  }>();
  const cameraRef = useRef<CameraView | null>(null);
  const permissionRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [policy, setPolicy] = useState<BiometricPolicyResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const forcedMode = params.mode === 'verify' ? 'verify' : params.mode === 'enroll' ? 'enroll' : null;
  const [mode, setMode] = useState<'enroll' | 'verify'>(forcedMode ?? 'enroll');
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [artifacts, setArtifacts] = useState<string[]>([]);

  useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode);
      setArtifacts([]);
    }
  }, [forcedMode]);

  async function refresh() {
    setLoading(true);
    try {
      await bootstrapDemoDevice();
      setPolicy(await loadBiometricPolicy());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('biometric.submitFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const copy =
    language === 'ru'
      ? {
          titleEnroll: 'Подтвердите лицо',
          titleVerify: 'Покажите лицо',
          subtitleEnroll:
            'Первый снимок сохранится как эталон для дальнейшей проверки сотрудника.',
          subtitleVerify:
            'Сделайте один снимок. Мы сравним его с сохраненным эталоном.',
          modeEnroll: 'Настройка',
          modeVerify: 'Проверка',
          cameraPermission: 'Нужен доступ к фронтальной камере.',
          cameraPermissionCta: 'Разрешить камеру',
          cameraPermissionSettingsCta: 'Открыть настройки',
          reset: 'Повторить',
          capture: 'Сделать снимок',
          submitEnroll: 'Next step',
          submitVerify: 'Next step',
          submitReady: 'Снимок готов',
          faceInstruction: 'Смотрите прямо в камеру',
        }
        : {
            titleEnroll: 'Setup your face',
            titleVerify: 'Show your face',
            subtitleEnroll:
            'This photo will be saved as the reference for future attendance checks',
          subtitleVerify:
            'Capture one photo. We will compare it against your saved reference',
          modeEnroll: 'Setup',
          modeVerify: 'Verify',
          cameraPermission: 'Camera access is required.',
          cameraPermissionCta: 'Enable camera',
          cameraPermissionSettingsCta: 'Open settings',
          reset: 'Retake',
          capture: 'Capture photo',
          submitEnroll: 'Next step',
          submitVerify: 'Next step',
          submitReady: 'Photo ready',
          faceInstruction: 'Look straight at the camera',
        };

  const steps = useMemo(() => [copy.faceInstruction], [copy.faceInstruction]);

  const currentStep = steps[artifacts.length] ?? null;
  const canSubmit = artifacts.length === steps.length;
  const capturedArtifact = artifacts[0] ?? null;

  const titleStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_700Bold',
    fontSize: 34,
    includeFontPadding: false,
    lineHeight: 38,
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

  const secondaryActionLabelStyle = {
    color: '#24314b',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    includeFontPadding: false,
    lineHeight: 22,
  } as const;

  const errorStyle = {
    color: '#b93b4a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 22,
  } as const;

  async function ensurePermission() {
    if (permission?.granted) return true;

    if (permission && !permission.canAskAgain) {
      await Linking.openSettings();
      return false;
    }

    const result = await requestPermission();

    if (!result.granted && !result.canAskAgain) {
      await Linking.openSettings();
    }

    return result.granted;
  }

  async function syncCameraPermission() {
    try {
      const nextPermission = await getPermission();
      if (nextPermission.granted) {
        setMessage(null);
      }
    } catch {
      // Ignore background permission refresh errors and keep the current UI state.
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }

      void syncCameraPermission();
      if (permissionRefreshTimerRef.current) {
        clearTimeout(permissionRefreshTimerRef.current);
      }
      permissionRefreshTimerRef.current = setTimeout(() => {
        void syncCameraPermission();
      }, 450);
    });

    return () => {
      subscription.remove();
      if (permissionRefreshTimerRef.current) {
        clearTimeout(permissionRefreshTimerRef.current);
      }
    };
  }, [getPermission]);

  async function captureStep() {
    const allowed = await ensurePermission();
    if (!allowed) {
      setMessage(t('biometric.permissionRequired'));
      return;
    }

    if (!cameraRef.current || !currentStep) return;

    setCapturing(true);
    setMessage(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
        skipProcessing: true,
      });
      if (!picture.base64) {
        throw new Error(t('biometric.captureMissingData'));
      }
      setArtifacts([`data:image/jpeg;base64,${picture.base64}`]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('biometric.captureFailed'));
    } finally {
      setCapturing(false);
    }
  }

  async function pollJob(jobId: string) {
    for (let index = 0; index < 12; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const job = await loadMyBiometricJob(jobId);

      if (job.status === 'COMPLETED') return job;
      if (job.status === 'FAILED') {
        throw new Error(job.errorMessage ?? t('biometric.verificationFailed'));
      }
    }

    throw new Error(t('biometric.processingStale'));
  }

  async function submitCapture() {
    if (!canSubmit) return;

    setProcessing(true);
    setMessage(null);

    const captureMetadata = {
      mode,
      captureSource: 'expo-camera',
      platform: 'mobile',
      frameCount: artifacts.length,
      challengeSteps: steps,
      capturedAt: new Date().toISOString(),
    };

    try {
      if (mode === 'enroll') {
        await startBiometricEnrollment();
        await completeBiometricEnrollmentWithArtifacts(artifacts, captureMetadata);
        if (params.returnTo) {
          router.replace({
            pathname: params.returnTo as never,
            params: {
              biometricEnrollmentStatus: 'ENROLLED',
              biometricMessage: t('biometric.enrollmentCompleted'),
              biometricTick: Date.now().toString(),
            },
          });
          return;
        }
        setMessage(t('biometric.enrollmentCompleted'));
      } else {
        const queuedJob = (await queueVerifyBiometricWithArtifacts(params.intent ?? 'mobile-attendance', artifacts, captureMetadata)) as BiometricJobItem;
        const result = await pollJob(queuedJob.id);
        if (params.returnTo && result.result?.result === 'PASSED' && result.result.verificationId) {
          router.replace({
            pathname: params.returnTo as never,
            params: {
              biometricVerificationId: result.result.verificationId,
              biometricResult: result.result.result,
              biometricMessage: t('biometric.verificationCompleted', { result: result.result.result }),
              biometricTick: Date.now().toString(),
            },
          });
          return;
        }
        setMessage(
          result.result?.result === 'FAILED'
            ? t('biometric.verificationFailed')
            : t('biometric.verificationCompleted', { result: result.result?.result ?? result.status }),
        );
      }

      setArtifacts([]);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('biometric.submitFailed'));
    } finally {
      setProcessing(false);
    }
  }

  const primaryActionLabel = !permission?.granted
    ? permission && !permission.canAskAgain
      ? copy.cameraPermissionSettingsCta
      : copy.cameraPermissionCta
    : canSubmit
      ? mode === 'enroll'
        ? copy.submitEnroll
        : copy.submitVerify
      : copy.capture;

  const isPrimaryActionDisabled =
    processing || capturing || (permission?.granted ? (!canSubmit && !currentStep) : false);

  async function handlePrimaryAction() {
    if (!permission?.granted) {
      if (permission && !permission.canAskAgain) {
        await Linking.openSettings();
        return;
      }

      await ensurePermission();
      return;
    }

    if (canSubmit) {
      await submitCapture();
      return;
    }

    await captureStep();
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <View className="flex-1 px-6 pb-8 pt-6">
        <View className="gap-4">
          <BrandWordmark className="text-center text-[46px] leading-[50px] text-[#26334a]" />
        </View>

        <View className="mt-10 flex-1">
          <View className="items-center gap-2">
            <Text style={[titleStyle, { textAlign: 'center' }]}>
              <Text style={{ fontFamily: 'Manrope_700Bold' }}>
                {mode === 'enroll'
                  ? copy.titleEnroll.split(' ')[0]
                  : copy.titleVerify.split(' ')[0]}
              </Text>
              <Text style={{ fontFamily: 'Manrope_700Bold' }}>
                {' '}
                {mode === 'enroll'
                  ? copy.titleEnroll.split(' ').slice(1).join(' ')
                  : copy.titleVerify.split(' ').slice(1).join(' ')}
              </Text>
            </Text>
            <Text style={[bodyStyle, { maxWidth: 290, textAlign: 'center' }]}>
              {mode === 'enroll' ? copy.subtitleEnroll : copy.subtitleVerify}
            </Text>
            {loading ? (
              <Text style={[bodyStyle, { textAlign: 'center' }]}>{t('biometric.loadingPolicy')}</Text>
            ) : policy ? null : (
              <Text style={[errorStyle, { textAlign: 'center' }]}>{t('biometric.policyUnavailable')}</Text>
            )}
          </View>

          <View className="mt-3">
            <View className="overflow-hidden rounded-[26px] bg-[#0f1724] shadow-panel" style={{ height: 420 }}>
              {permission?.granted ? (
                capturedArtifact ? (
                  <Image resizeMode="cover" source={{ uri: capturedArtifact }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <CameraView facing="front" mode="picture" ref={cameraRef} style={StyleSheet.absoluteFillObject} />
                )
              ) : (
                <View className="flex-1 items-center justify-center gap-4 bg-[#f9fbff] px-6">
                  <Text className="text-center" style={bodyStyle}>{copy.cameraPermission}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="mt-6 gap-3">
          {message ? (
            <Text style={[errorStyle, { textAlign: 'center' }]}>{message}</Text>
          ) : null}

          <PressableScale
            className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
              isPrimaryActionDisabled ? 'opacity-70' : ''
            }`}
            disabled={isPrimaryActionDisabled}
            haptic="medium"
            onPress={() => void handlePrimaryAction()}
          >
            <Text style={actionLabelStyle}>
              {capturing
                ? t('biometric.capturing')
                : processing
                  ? t('common.processing')
                  : primaryActionLabel}
            </Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}
