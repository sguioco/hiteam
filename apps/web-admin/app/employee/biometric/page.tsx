'use client';

import { useEffect, useState } from 'react';
import { BiometricPolicyResponse } from '@smart/types';
import { AwsLivenessPanel } from '../../../components/aws-liveness-panel';
import { BiometricCapturePanel } from '../../../components/biometric-capture-panel';
import { EmployeeShell } from '../../../components/employee-shell';
import { apiRequest } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';

export default function EmployeeBiometricPage() {
  const { t } = useI18n();
  const [policy, setPolicy] = useState<BiometricPolicyResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadPolicy() {
    const session = getSession();
    if (!session) return;
    const response = await apiRequest<BiometricPolicyResponse>('/biometric/policy', { token: session.accessToken });
    setPolicy(response);
  }

  useEffect(() => {
    void loadPolicy().catch(() => setError(t('employeePortal.biometricError')));
  }, [t]);

  async function startEnrollment() {
    const session = getSession();
    if (!session) return;

    await apiRequest('/biometric/enroll/start', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ consentVersion: 'v1-web-guided' }),
    });
    await loadPolicy();
  }

  async function completeEnrollment(payload: {
    templateRef?: string;
    livenessScore: number;
    captureMetadata: Record<string, unknown>;
    artifacts: string[];
  }) {
    const session = getSession();
    if (!session) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await startEnrollment();
      await apiRequest('/biometric/enroll/complete', {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({
          templateRef: payload.templateRef ?? `web-guided-${Date.now()}`,
          livenessScore: payload.livenessScore,
          captureMetadata: payload.captureMetadata,
          artifacts: payload.artifacts,
        }),
      });
      setMessage(t('employeePortal.enrollmentCompleted'));
      await loadPolicy();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t('employeePortal.biometricError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">{t('employeePortal.biometricCard')}</span>
          <h1>{t('employeePortal.biometricTitle')}</h1>
          <p>{t('employeePortal.biometricSubtitle')}</p>
        </section>

        <section className="employee-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('employeePortal.step1')}</span>
                <h2>{policy?.enrollmentStatus ?? 'NOT_STARTED'}</h2>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span>{t('employeePortal.captureMode')}</span>
                <strong>{t('employeePortal.guidedEnrollment')}</strong>
              </div>
              <div className="detail-row">
                <span>{t('employeePortal.biometricCard')}</span>
                <strong>{policy?.provider ?? 'internal-placeholder'}</strong>
              </div>
            </div>
          </article>

          <article className="panel feature-panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('employeePortal.step2')}</span>
                <h2>{t('employeePortal.biometricReady')}</h2>
              </div>
            </div>
            {policy?.provider === 'aws-rekognition' ? (
              <AwsLivenessPanel busy={busy} mode="enroll" onComplete={completeEnrollment} />
            ) : (
              <BiometricCapturePanel busy={busy} mode="enroll" onSubmit={completeEnrollment} />
            )}
          </article>
        </section>

        {message ? <div className="inline-note">{message}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}
      </section>
    </EmployeeShell>
  );
}
