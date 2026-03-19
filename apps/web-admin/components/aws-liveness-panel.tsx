'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { getSession } from '../lib/auth';
import { useI18n } from '../lib/i18n';

const FaceLivenessDetectorCore = dynamic(
  () => import('@aws-amplify/ui-react-liveness').then((module) => module.FaceLivenessDetectorCore),
  { ssr: false },
);

type Props = {
  mode: 'enroll' | 'verify';
  busy?: boolean;
  onComplete: (payload: {
    templateRef?: string;
    livenessScore: number;
    captureMetadata: Record<string, unknown>;
    artifacts: string[];
  }) => Promise<void>;
  onCancel?: () => void;
};

type BootstrapPayload = {
  sessionId: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration?: string | null;
  };
};

export function AwsLivenessPanel({ mode, busy = false, onComplete, onCancel }: Props) {
  const { t } = useI18n();
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const credentialProvider = useMemo(() => {
    if (!bootstrap) {
      return undefined;
    }

    return async () => ({
      accessKeyId: bootstrap.credentials.accessKeyId,
      secretAccessKey: bootstrap.credentials.secretAccessKey,
      sessionToken: bootstrap.credentials.sessionToken,
      expiration: bootstrap.credentials.expiration ? new Date(bootstrap.credentials.expiration) : undefined,
    });
  }, [bootstrap]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const session = getSession();
      if (!session) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload = await apiRequest<BootstrapPayload>('/biometric/liveness/aws/bootstrap', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({ mode }),
        });

        if (!cancelled) {
          setBootstrap(payload);
        }
      } catch (initError) {
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : t('employeePortal.awsLivenessUnavailable'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [mode, t]);

  async function handleAnalysisComplete() {
    if (!bootstrap) {
      return;
    }

    await onComplete({
      livenessScore: 0.95,
      captureMetadata: {
        awsLivenessSessionId: bootstrap.sessionId,
        provider: 'aws-rekognition',
        mode,
      },
      artifacts: [],
    });
  }

  if (isLoading) {
    return <div className="inline-note">{t('employeePortal.awsLivenessLoading')}</div>;
  }

  if (error || !bootstrap || !credentialProvider) {
    return <div className="error-box">{error ?? t('employeePortal.awsLivenessUnavailable')}</div>;
  }

  return (
    <div className="aws-liveness-shell">
      <div className="aws-liveness-header">
        <strong>{mode === 'enroll' ? t('employeePortal.awsLivenessEnroll') : t('employeePortal.awsLivenessVerify')}</strong>
        <span>{t('employeePortal.awsLivenessHint')}</span>
      </div>
      <div className="aws-liveness-stage">
        <FaceLivenessDetectorCore
          config={{ credentialProvider }}
          disableStartScreen={false}
          onAnalysisComplete={handleAnalysisComplete}
          onError={(livenessError) => setError(livenessError.error.message)}
          onUserCancel={onCancel}
          region={bootstrap.region}
          sessionId={bootstrap.sessionId}
        />
      </div>
      {busy ? <div className="inline-note">{t('employeePortal.processingCapture')}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
    </div>
  );
}
