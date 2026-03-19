import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BiometricJobItem, BiometricPolicyResponse } from '@smart/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Screen } from '../../components/ui/screen';
import {
  bootstrapDemoDevice,
  completeBiometricEnrollmentWithArtifacts,
  loadBiometricPolicy,
  loadMyBiometricJob,
  queueVerifyBiometricWithArtifacts,
  startBiometricEnrollment,
} from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export default function BiometricPage() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    mode?: string;
    intent?: string;
    returnTo?: string;
  }>();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
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

  const steps = useMemo(
    () =>
      mode === 'enroll'
        ? [t('biometric.step.faceCentered'), t('biometric.step.turnLeft'), t('biometric.step.turnRight')]
        : [t('biometric.step.faceCentered'), t('biometric.step.blinkOnce')],
    [mode, t],
  );

  const currentStep = steps[artifacts.length] ?? null;
  const canSubmit = artifacts.length === steps.length;

  async function ensurePermission() {
    if (permission?.granted) return true;
    const result = await requestPermission();
    return result.granted;
  }

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
      const picture = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.55 });
      if (!picture.base64) {
        throw new Error(t('biometric.captureMissingData'));
      }
      setArtifacts((current) => [...current, `data:image/jpeg;base64,${picture.base64}`]);
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
          result.result?.result === 'REVIEW'
            ? t('biometric.reviewRequired')
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

  return (
    <Screen contentClassName="pb-10">
      <StatusBar style="dark" />

      <Card className="gap-4">
        <View className="gap-2">
          <Badge label={t('biometric.eyebrow')} variant="brand" />
          <Text className="text-[30px] font-extrabold text-foreground">{t('biometric.title')}</Text>
          <Text className="text-[15px] leading-6 text-muted">
            {loading
              ? t('biometric.loadingPolicy')
              : policy
                ? t('biometric.policyStatus', { status: policy.enrollmentStatus, provider: policy.provider })
                : t('biometric.policyUnavailable')}
          </Text>
        </View>

        {forcedMode ? null : (
          <View className="flex-row gap-2">
            <Pressable
              className={`flex-1 rounded-2xl border-2 p-4 ${mode === 'enroll' ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
              onPress={() => {
                setMode('enroll');
                setArtifacts([]);
              }}
            >
              <Text className={`text-center text-[15px] font-extrabold ${mode === 'enroll' ? 'text-brand-foreground' : 'text-foreground'}`}>{t('biometric.enroll')}</Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-2xl border-2 p-4 ${mode === 'verify' ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
              onPress={() => {
                setMode('verify');
                setArtifacts([]);
              }}
            >
              <Text className={`text-center text-[15px] font-extrabold ${mode === 'verify' ? 'text-brand-foreground' : 'text-foreground'}`}>{t('biometric.verify')}</Text>
            </Pressable>
          </View>
        )}

        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
      </Card>

      <View className="overflow-hidden rounded-2xl border-2 border-border bg-[#1c1711]" style={{ height: 380 }}>
        {permission?.granted ? (
          <CameraView facing="front" mode="picture" ref={cameraRef} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View className="flex-1 items-center justify-center gap-4 bg-surface p-5">
            <Text className="text-center text-[15px] leading-6 text-muted">{t('biometric.grantCamera')}</Text>
            <Button label={t('common.enableCamera')} onPress={() => void ensurePermission()} />
          </View>
        )}
      </View>

      <Card className="gap-3">
        <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">
          {mode === 'enroll' ? t('biometric.enrollmentSequence') : t('biometric.verificationSequence')}
        </Text>
        <Text className="text-[24px] font-extrabold text-foreground">{currentStep ?? t('biometric.sequenceComplete')}</Text>
        <Text className="text-[15px] leading-6 text-muted">
          {currentStep ? t('biometric.captureStepProgress', { current: artifacts.length + 1, total: steps.length }) : t('biometric.reviewComplete')}
        </Text>
        <Text className="text-[15px] leading-6 text-muted">{t('biometric.capturedFrames', { count: artifacts.length })}</Text>
      </Card>

      <Button disabled={capturing || processing || !currentStep} fullWidth label={capturing ? t('biometric.capturing') : t('biometric.captureStep')} onPress={() => void captureStep()} size="lg" />

      <View className="flex-row gap-3">
        <Button className="flex-1" label={t('biometric.resetSequence')} onPress={() => setArtifacts([])} variant="secondary" />
        <Button
          className="flex-1"
          disabled={!canSubmit || processing}
          label={processing ? t('common.processing') : mode === 'enroll' ? t('biometric.submitEnrollment') : t('biometric.submitVerification')}
          onPress={() => void submitCapture()}
          variant="secondary"
        />
      </View>

      {message ? (
        <Card className="gap-2">
          <Text className="text-[15px] leading-6 text-foreground">{message}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
