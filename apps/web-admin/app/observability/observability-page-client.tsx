'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ObservabilitySummaryResponse } from '@smart/types';
import { AdminShell } from '../../components/admin-shell';
import { apiRequest } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

function formatUptime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function ObservabilityPageClient({
  initialSummary,
}: {
  initialSummary?: ObservabilitySummaryResponse | null;
}) {
  const { t } = useI18n();
  const session = getSession();
  const canManageQueues = session?.user.roleCodes.some((roleCode) =>
    ['tenant_owner', 'hr_admin', 'operations_admin'].includes(roleCode),
  ) ?? false;
  const [summary, setSummary] = useState<ObservabilitySummaryResponse | null>(initialSummary ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeQueueAction, setActiveQueueAction] = useState<string | null>(null);
  const didUseInitialSummary = useRef(Boolean(initialSummary));

  async function load() {
    const session = getSession();
    if (!session) return null;

    return apiRequest<ObservabilitySummaryResponse>('/observability/summary', {
      token: session.accessToken,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadIntoState() {
      const data = await load();
      if (!cancelled && data) {
        setSummary(data);
      }
    }

    if (didUseInitialSummary.current) {
      didUseInitialSummary.current = false;
    } else {
      void loadIntoState();
    }

    const intervalId = window.setInterval(() => {
      void loadIntoState();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleQueueAction(queueKey: 'exports' | 'biometric' | 'push', action: 'pause' | 'resume') {
    const session = getSession();
    if (!session) return;

    const actionKey = `${queueKey}:${action}`;
    setActiveQueueAction(actionKey);
    setMessage(null);

    try {
      await apiRequest(`/observability/queues/${queueKey}/${action}`, {
        method: 'POST',
        token: session.accessToken,
      });
      const data = await load();
      if (data) {
        setSummary(data);
      }
      setMessage(action === 'pause' ? t('observability.queuePaused') : t('observability.queueResumed'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('observability.queueActionFailed'));
    } finally {
      setActiveQueueAction(null);
    }
  }

  return (
    <AdminShell>
      <main className="page-shell section-stack">
        {summary ? <div className="inline-note">{t('observability.updatedAt')}: {new Date(summary.asOf).toLocaleString()}</div> : null}
        {message ? <div className="inline-note">{message}</div> : null}

        {summary ? (
          <>
            <section className="hero-grid">
              <article className="metric-card">
                <span className="metric-label">{t('observability.apiUptime')}</span>
                <strong className="metric-value">{formatUptime(summary.runtime.apiUptimeSeconds)}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">{t('observability.notificationSockets')}</span>
                <strong className="metric-value">{summary.runtime.notificationSocket.connectedClients}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">{t('observability.attendanceSockets')}</span>
                <strong className="metric-value">{summary.runtime.attendanceSocket.connectedClients}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">{t('observability.snapshotCoverage')}</span>
                <strong className="metric-value">{summary.snapshots.last24HoursCount}</strong>
              </article>
              <article className="metric-card metric-card--accent">
                <span className="metric-label">{t('observability.pushFailureRate')}</span>
                <strong className="metric-value">{summary.deliveries.pushFailureRate24h}%</strong>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.queueControls')}</span>
                    <h2>{t('observability.runtimeActions')}</h2>
                  </div>
                </div>
                <div className="section-stack compact-stack">
                  {(['exports', 'biometric', 'push'] as const).map((queueKey) => {
                    const runtime = summary.queueControls[queueKey];
                    return (
                      <div className="timeline-item" key={queueKey}>
                        <strong>{queueKey}</strong>
                        <span>{t('observability.transport')}: {runtime.mode}</span>
                        <span>{t('observability.queuePausedLabel')}: {runtime.paused ? 'yes' : 'no'}</span>
                        {runtime.available && canManageQueues ? (
                          <div className="action-row">
                            <button
                              className="ghost-button"
                              disabled={runtime.paused || activeQueueAction === `${queueKey}:pause`}
                              onClick={() => void handleQueueAction(queueKey, 'pause')}
                              type="button"
                            >
                              {activeQueueAction === `${queueKey}:pause` ? t('observability.queueActionRunning') : t('observability.pauseQueue')}
                            </button>
                            <button
                              className="ghost-button"
                              disabled={!runtime.paused || activeQueueAction === `${queueKey}:resume`}
                              onClick={() => void handleQueueAction(queueKey, 'resume')}
                              type="button"
                            >
                              {activeQueueAction === `${queueKey}:resume` ? t('observability.queueActionRunning') : t('observability.resumeQueue')}
                            </button>
                          </div>
                        ) : (
                          <span>{runtime.available ? t('observability.queueViewOnly') : t('observability.inlineRuntime')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.notificationsRealtime')}</span>
                    <h2>{summary.runtime.notificationsRealtime.transport}</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>{t('observability.transport')}</span><strong>{summary.runtime.notificationsRealtime.transport}</strong></div>
                  <div className="detail-row"><span>{t('observability.publisherStatus')}</span><strong>{summary.runtime.notificationsRealtime.publisherStatus}</strong></div>
                  <div className="detail-row"><span>{t('observability.subscriberStatus')}</span><strong>{summary.runtime.notificationsRealtime.subscriberStatus}</strong></div>
                  <div className="detail-row"><span>{t('observability.connectedClients')}</span><strong>{summary.runtime.notificationSocket.connectedClients}</strong></div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.attendanceRealtime')}</span>
                    <h2>{summary.runtime.attendanceRealtime.transport}</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>{t('observability.transport')}</span><strong>{summary.runtime.attendanceRealtime.transport}</strong></div>
                  <div className="detail-row"><span>{t('observability.publisherStatus')}</span><strong>{summary.runtime.attendanceRealtime.publisherStatus}</strong></div>
                  <div className="detail-row"><span>{t('observability.subscriberStatus')}</span><strong>{summary.runtime.attendanceRealtime.subscriberStatus}</strong></div>
                  <div className="detail-row"><span>{t('observability.connectedClients')}</span><strong>{summary.runtime.attendanceSocket.connectedClients}</strong></div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.deliveryHealth')}</span>
                    <h2>{t('observability.pushFailureRate')}</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>Total</span><strong>{summary.deliveries.pushTotal24h}</strong></div>
                  <div className="detail-row"><span>Failed</span><strong>{summary.deliveries.pushFailed24h}</strong></div>
                  <div className="detail-row"><span>{t('observability.pushReceiptErrors')}</span><strong>{summary.deliveries.pushReceiptErrors24h}</strong></div>
                  <div className="detail-row"><span>{t('observability.pushFailureRate')}</span><strong>{summary.deliveries.pushFailureRate24h}%</strong></div>
                </div>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.backgroundJobs')}</span>
                    <h2>Exports</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>Total / 24h</span><strong>{summary.jobs.exportTotal24h}</strong></div>
                  <div className="detail-row"><span>Failed / 24h</span><strong>{summary.jobs.exportFailed24h}</strong></div>
                  <div className="detail-row"><span>{t('observability.exportFailureRate')}</span><strong>{summary.jobs.exportFailureRate24h}%</strong></div>
                </div>
                <Link className="ghost-button button-link" href="/diagnostics#diagnostics-exports">{t('observability.openExportsDrilldown')}</Link>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.backgroundJobs')}</span>
                    <h2>Biometric</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>Total / 24h</span><strong>{summary.jobs.biometricTotal24h}</strong></div>
                  <div className="detail-row"><span>Failed / 24h</span><strong>{summary.jobs.biometricFailed24h}</strong></div>
                  <div className="detail-row"><span>{t('observability.biometricFailureRate')}</span><strong>{summary.jobs.biometricFailureRate24h}%</strong></div>
                </div>
                <Link className="ghost-button button-link" href="/diagnostics#diagnostics-biometric">{t('observability.openBiometricDrilldown')}</Link>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">{t('observability.liveQueues')}</span>
                    <h2>{t('nav.diagnostics')}</h2>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row"><span>Export queued</span><strong>{summary.liveQueues.exports.queued}</strong></div>
                  <div className="detail-row"><span>Biometric queued</span><strong>{summary.liveQueues.biometric.queued}</strong></div>
                  <div className="detail-row"><span>Push pending receipts</span><strong>{summary.liveQueues.push.pendingReceipts}</strong></div>
                  <div className="detail-row"><span>{t('observability.lastSnapshot')}</span><strong>{summary.snapshots.lastCapturedAt ? new Date(summary.snapshots.lastCapturedAt).toLocaleString() : '—'}</strong></div>
                </div>
                <div className="action-row">
                  <Link className="ghost-button button-link" href="/diagnostics#diagnostics-push">{t('observability.openPushDrilldown')}</Link>
                  <Link className="ghost-button button-link" href="/diagnostics">{t('observability.openDiagnostics')}</Link>
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">{t('observability.alertsTitle')}</span>
                  <h2>{t('dashboard.alerts')}</h2>
                </div>
              </div>
              <div className="section-stack compact-stack">
                {summary.alerts.length > 0 ? summary.alerts.map((alert) => (
                  <div className={`timeline-item ${alert.severity === 'critical' ? 'timeline-item-critical' : ''}`} key={alert.id}>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                )) : <div className="empty-state">{t('observability.noAlerts')}</div>}
              </div>
            </section>
          </>
        ) : (
          <div className="empty-state">No data yet.</div>
        )}
      </main>
    </AdminShell>
  );
}
