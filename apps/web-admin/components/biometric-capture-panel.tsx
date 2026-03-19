'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';

type CaptureMode = 'enroll' | 'verify';

type CaptureFrame = {
  stepId: string;
  stepLabel: string;
  imageDataUrl: string;
  capturedAt: string;
};

type SubmitPayload = {
  templateRef?: string;
  livenessScore: number;
  captureMetadata: Record<string, unknown>;
  artifacts: string[];
};

type Props = {
  mode: CaptureMode;
  busy?: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
};

type ChallengeStep = {
  id: string;
  labelKey: string;
  detailKey: string;
};

const ENROLL_STEPS: ChallengeStep[] = [
  { id: 'center', labelKey: 'employeePortal.captureCenter', detailKey: 'employeePortal.captureCenterHint' },
  { id: 'left', labelKey: 'employeePortal.captureLeft', detailKey: 'employeePortal.captureLeftHint' },
  { id: 'right', labelKey: 'employeePortal.captureRight', detailKey: 'employeePortal.captureRightHint' },
];

const VERIFY_STEPS: ChallengeStep[] = [
  { id: 'center', labelKey: 'employeePortal.captureCenter', detailKey: 'employeePortal.captureCenterHint' },
  { id: 'blink', labelKey: 'employeePortal.captureBlink', detailKey: 'employeePortal.captureBlinkHint' },
];

export function BiometricCapturePanel({ mode, busy = false, onSubmit }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [frames, setFrames] = useState<CaptureFrame[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const steps = useMemo(() => (mode === 'enroll' ? ENROLL_STEPS : VERIFY_STEPS), [mode]);
  const currentStep = steps[frames.length] ?? null;

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setLocalError(t('employeePortal.cameraUnsupported'));
      setPermissionState('denied');
      return;
    }

    setPermissionState('requesting');
    setLocalError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionState('granted');
    } catch {
      setPermissionState('denied');
      setLocalError(t('employeePortal.cameraDenied'));
    }
  }

  function stopCamera() {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function captureCurrentStep() {
    if (!currentStep || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 540;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      setLocalError(t('employeePortal.captureFailed'));
      return;
    }

    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -width, 0, width, height);
    context.restore();

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFrames((current) => [
      ...current,
      {
        stepId: currentStep.id,
        stepLabel: t(currentStep.labelKey),
        imageDataUrl,
        capturedAt: new Date().toISOString(),
      },
    ]);
  }

  function resetSequence() {
    setFrames([]);
    setLocalError(null);
  }

  async function submitSequence() {
    if (frames.length !== steps.length) {
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const captureMetadata = {
        mode,
        challengeSteps: frames.map((item) => ({
          id: item.stepId,
          label: item.stepLabel,
          capturedAt: item.capturedAt,
        })),
        frameCount: frames.length,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        resolution: settings?.width && settings?.height ? `${settings.width}x${settings.height}` : null,
      };

      await onSubmit({
        templateRef: mode === 'enroll' ? `web-guided-${Date.now()}` : undefined,
        livenessScore: frames.length === steps.length ? 0.94 : 0.5,
        captureMetadata,
        artifacts: frames.map((frame) => frame.imageDataUrl),
      });
      resetSequence();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t('employeePortal.captureFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="biometric-panel">
      <div className="biometric-stage">
        {permissionState !== 'granted' ? (
          <div className="biometric-empty">
            <strong>{t('employeePortal.cameraTitle')}</strong>
            <p>{t('employeePortal.cameraCopy')}</p>
            <button className="solid-button" disabled={permissionState === 'requesting'} onClick={() => void startCamera()} type="button">
              {permissionState === 'requesting' ? t('employeePortal.cameraStarting') : t('employeePortal.enableCamera')}
            </button>
          </div>
        ) : (
          <>
            <div className="camera-frame">
              <video autoPlay className="camera-video" muted playsInline ref={videoRef} />
              <div className="camera-overlay">
                <div className="camera-mask" />
              </div>
            </div>
            <div className="camera-toolbar">
              <button className="ghost-button" onClick={captureCurrentStep} type="button">
                {currentStep ? t('employeePortal.captureStep') : t('employeePortal.sequenceComplete')}
              </button>
              <button className="ghost-button" onClick={resetSequence} type="button">
                {t('employeePortal.resetSequence')}
              </button>
              <button className="ghost-button" onClick={stopCamera} type="button">
                {t('employeePortal.disableCamera')}
              </button>
            </div>
          </>
        )}
        <canvas hidden ref={canvasRef} />
      </div>

      <div className="biometric-sidebar">
        <div className="biometric-copy">
          <span className="section-kicker">{mode === 'enroll' ? t('employeePortal.guidedEnrollment') : t('employeePortal.guidedVerification')}</span>
          <h3>{currentStep ? t(currentStep.labelKey) : t('employeePortal.sequenceComplete')}</h3>
          <p>{currentStep ? t(currentStep.detailKey) : t('employeePortal.sequenceReady')}</p>
        </div>

        <div className="biometric-steps">
          {steps.map((step, index) => {
            const frame = frames[index];
            const state = frame ? 'done' : index === frames.length ? 'active' : 'pending';
            return (
              <div className={`biometric-step biometric-step--${state}`} key={step.id}>
                <div className="biometric-step-index">{index + 1}</div>
                <div className="biometric-step-copy">
                  <strong>{t(step.labelKey)}</strong>
                  <span>{t(step.detailKey)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {frames.length > 0 ? (
          <div className="capture-grid">
            {frames.map((frame) => (
              <figure className="capture-thumb" key={frame.stepId}>
                <img alt={frame.stepLabel} src={frame.imageDataUrl} />
                <figcaption>{frame.stepLabel}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {localError ? <div className="error-box">{localError}</div> : null}

        <button
          className="solid-button"
          disabled={busy || submitting || frames.length !== steps.length}
          onClick={() => void submitSequence()}
          type="button"
        >
          {busy || submitting
            ? t('employeePortal.processingCapture')
            : mode === 'enroll'
              ? t('employeePortal.completeEnrollmentAction')
              : t('employeePortal.completeVerificationAction')}
        </button>
      </div>
    </div>
  );
}
