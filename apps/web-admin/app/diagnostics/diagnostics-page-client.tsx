'use client';

import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import {
  DiagnosticsPolicy,
  DiagnosticsSummaryResponse,
  DiagnosticsTrendsResponse,
  ExportJobsResponse,
  PushDiagnosticsResponse,
  PushDeliveryItem,
  TeamBiometricJobsResponse,
} from '@smart/types';
import { AdminShell } from '../../components/admin-shell';
import { AppSelectField } from '../../components/ui/select';
import { apiRequest } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

export type DiagnosticsPageInitialData = {
  biometricJobs: TeamBiometricJobsResponse['items'];
  biometricMeta: { page: number; total: number; totalPages: number };
  exportsData: ExportJobsResponse['items'];
  exportMeta: { page: number; total: number; totalPages: number };
  policy: DiagnosticsPolicy | null;
  pushDeliveries: PushDeliveryItem[];
  pushMeta: { page: number; total: number; totalPages: number };
  summary: DiagnosticsSummaryResponse | null;
  trends: DiagnosticsTrendsResponse | null;
};

export default function DiagnosticsPageClient({
  initialData,
}: {
  initialData?: DiagnosticsPageInitialData | null;
}) {
  const { locale, t } = useI18n();
  const localeTag = locale === 'ru' ? 'ru-RU' : 'en-US';
  const session = getSession();
  const canManagePolicy = session?.user.roleCodes.some((roleCode) =>
    ['tenant_owner', 'hr_admin', 'operations_admin'].includes(roleCode),
  ) ?? false;
  const canOperateQueues = canManagePolicy;
  const [message, setMessage] = useState<string | null>(null);
  const [policy, setPolicy] = useState<DiagnosticsPolicy | null>(initialData?.policy ?? null);
  const [summary, setSummary] = useState<DiagnosticsSummaryResponse | null>(initialData?.summary ?? null);
  const [trends, setTrends] = useState<DiagnosticsTrendsResponse | null>(initialData?.trends ?? null);
  const [exportsData, setExportsData] = useState<ExportJobsResponse['items']>(initialData?.exportsData ?? []);
  const [biometricJobs, setBiometricJobs] = useState<TeamBiometricJobsResponse['items']>(initialData?.biometricJobs ?? []);
  const [pushDeliveries, setPushDeliveries] = useState<PushDeliveryItem[]>(initialData?.pushDeliveries ?? []);
  const [activeRetryKey, setActiveRetryKey] = useState<string | null>(null);
  const [exportStatusFilter, setExportStatusFilter] = useState<'ALL' | ExportJobsResponse['items'][number]['status']>('ALL');
  const [exportSearch, setExportSearch] = useState('');
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [biometricStatusFilter, setBiometricStatusFilter] = useState<'ALL' | TeamBiometricJobsResponse['items'][number]['status']>('ALL');
  const [biometricSearch, setBiometricSearch] = useState('');
  const [selectedBiometricIds, setSelectedBiometricIds] = useState<string[]>([]);
  const [pushStatusFilter, setPushStatusFilter] = useState<'ALL' | PushDeliveryItem['status']>('ALL');
  const [pushReceiptFilter, setPushReceiptFilter] = useState<'ALL' | NonNullable<PushDeliveryItem['receiptStatus']>>('ALL');
  const [pushSearch, setPushSearch] = useState('');
  const [selectedPushIds, setSelectedPushIds] = useState<string[]>([]);
  const [selectedPushReceiptIds, setSelectedPushReceiptIds] = useState<string[]>([]);
  const [exportPage, setExportPage] = useState(1);
  const [biometricPage, setBiometricPage] = useState(1);
  const [pushPage, setPushPage] = useState(1);
  const [exportMeta, setExportMeta] = useState(initialData?.exportMeta ?? { total: 0, page: 1, totalPages: 1 });
  const [biometricMeta, setBiometricMeta] = useState(initialData?.biometricMeta ?? { total: 0, page: 1, totalPages: 1 });
  const [pushMeta, setPushMeta] = useState(initialData?.pushMeta ?? { total: 0, page: 1, totalPages: 1 });
  const didUseInitialData = useRef(Boolean(initialData));

  function buildQuery(params: Record<string, string | number | undefined>) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query.length > 0 ? `?${query}` : '';
  }

  async function loadDiagnostics() {
    const session = getSession();
    if (!session) return;

    const [summaryResponse, policyResponse, trendsResponse, exportsResponse, biometricResponse, pushResponse] = await Promise.all([
      apiRequest<DiagnosticsSummaryResponse>('/diagnostics/summary', { token: session.accessToken }),
      apiRequest<DiagnosticsPolicy>('/diagnostics/policy', { token: session.accessToken }),
      apiRequest<DiagnosticsTrendsResponse>('/diagnostics/trends?hours=24', { token: session.accessToken }),
      apiRequest<ExportJobsResponse>(
        `/exports/jobs${buildQuery({ page: exportPage, status: exportStatusFilter === 'ALL' ? undefined : exportStatusFilter, search: exportSearch || undefined })}`,
        { token: session.accessToken },
      ),
      apiRequest<TeamBiometricJobsResponse>(
        `/biometric/jobs/team${buildQuery({ page: biometricPage, status: biometricStatusFilter === 'ALL' ? undefined : biometricStatusFilter, search: biometricSearch || undefined })}`,
        { token: session.accessToken },
      ),
      apiRequest<PushDiagnosticsResponse>(
        `/push/diagnostics${buildQuery({
          page: pushPage,
          status: pushStatusFilter === 'ALL' ? undefined : pushStatusFilter,
          receiptStatus: pushReceiptFilter === 'ALL' ? undefined : pushReceiptFilter,
          search: pushSearch || undefined,
        })}`,
        { token: session.accessToken },
      ),
    ]);

    setSummary(summaryResponse);
    setPolicy(policyResponse);
    setTrends(trendsResponse);
    setExportsData(exportsResponse.items);
    setBiometricJobs(biometricResponse.items);
    setPushDeliveries(pushResponse.items);
    setExportMeta({ total: exportsResponse.total, page: exportsResponse.page, totalPages: exportsResponse.totalPages });
    setBiometricMeta({ total: biometricResponse.total, page: biometricResponse.page, totalPages: biometricResponse.totalPages });
    setPushMeta({ total: pushResponse.total, page: pushResponse.page, totalPages: pushResponse.totalPages });
  }

  useEffect(() => {
    const usingDefaultFilters =
      exportPage === 1 &&
      exportStatusFilter === 'ALL' &&
      exportSearch === '' &&
      biometricPage === 1 &&
      biometricStatusFilter === 'ALL' &&
      biometricSearch === '' &&
      pushPage === 1 &&
      pushReceiptFilter === 'ALL' &&
      pushSearch === '' &&
      pushStatusFilter === 'ALL';

    if (didUseInitialData.current && usingDefaultFilters) {
      didUseInitialData.current = false;
    } else {
      void loadDiagnostics().catch(() => undefined);
    }

    const intervalId = window.setInterval(() => {
      void loadDiagnostics().catch(() => undefined);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [exportPage, exportSearch, exportStatusFilter, biometricPage, biometricSearch, biometricStatusFilter, pushPage, pushReceiptFilter, pushSearch, pushStatusFilter]);

  async function handlePolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const formData = new FormData(event.currentTarget);

    const nextPolicy = await apiRequest<DiagnosticsPolicy>('/diagnostics/policy', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        exportQueueWarningMinutes: Number(formData.get('exportQueueWarningMinutes')),
        exportQueueCriticalMinutes: Number(formData.get('exportQueueCriticalMinutes')),
        biometricQueueWarningMinutes: Number(formData.get('biometricQueueWarningMinutes')),
        biometricQueueCriticalMinutes: Number(formData.get('biometricQueueCriticalMinutes')),
        exportFailureWarningCount24h: Number(formData.get('exportFailureWarningCount24h')),
        biometricFailureWarningCount24h: Number(formData.get('biometricFailureWarningCount24h')),
        pushFailureCriticalCount24h: Number(formData.get('pushFailureCriticalCount24h')),
        pushReceiptErrorCriticalCount: Number(formData.get('pushReceiptErrorCriticalCount')),
        criticalAnomaliesCriticalCount: Number(formData.get('criticalAnomaliesCriticalCount')),
        pendingBiometricReviewWarningCount: Number(formData.get('pendingBiometricReviewWarningCount')),
        repeatIntervalMinutes: Number(formData.get('repeatIntervalMinutes')),
        notifyTenantOwner: formData.get('notifyTenantOwner') === 'on',
        notifyHrAdmin: formData.get('notifyHrAdmin') === 'on',
        notifyOperationsAdmin: formData.get('notifyOperationsAdmin') === 'on',
        notifyManagers: formData.get('notifyManagers') === 'on',
      }),
    });

    setPolicy(nextPolicy);
    setMessage(t('diagnostics.policySaved'));
  }

  async function handleRetry(kind: 'export' | 'biometric' | 'push' | 'push-receipt', id: string) {
    const session = getSession();
    if (!session) return;

    const retryKey = `${kind}:${id}`;
    setActiveRetryKey(retryKey);
    setMessage(null);

    try {
      const path =
        kind === 'export'
          ? `/exports/jobs/${id}/requeue`
          : kind === 'biometric'
            ? `/biometric/jobs/${id}/requeue`
            : kind === 'push'
              ? `/push/deliveries/${id}/requeue`
              : `/push/deliveries/${id}/retry-receipt-check`;

      await apiRequest<unknown>(path, {
        method: 'POST',
        token: session.accessToken,
      });

      await loadDiagnostics();
      setMessage(kind === 'push-receipt' ? t('diagnostics.receiptCheckRetried') : t('diagnostics.jobRequeued'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : kind === 'push-receipt'
            ? t('diagnostics.receiptCheckRetryFailed')
            : t('diagnostics.jobRequeueFailed'),
      );
    } finally {
      setActiveRetryKey(null);
    }
  }

  async function handleBulkAction(kind: 'export' | 'biometric' | 'push' | 'push-receipt', ids: string[]) {
    const session = getSession();
    if (!session || ids.length === 0) return;

    const actionKey = `${kind}:bulk`;
    setActiveRetryKey(actionKey);
    setMessage(null);

    try {
      const path =
        kind === 'export'
          ? '/exports/jobs/bulk-requeue'
          : kind === 'biometric'
            ? '/biometric/jobs/bulk-requeue'
            : kind === 'push'
              ? '/push/deliveries/bulk-requeue'
              : '/push/deliveries/bulk-retry-receipt-check';

      await apiRequest<unknown>(path, {
        method: 'POST',
        token: session.accessToken,
        body: JSON.stringify({ ids }),
      });

      await loadDiagnostics();
      setSelectedExportIds([]);
      setSelectedBiometricIds([]);
      setSelectedPushIds([]);
      setSelectedPushReceiptIds([]);
      setMessage(kind === 'push-receipt' ? t('diagnostics.receiptCheckRetried') : t('diagnostics.jobRequeued'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : kind === 'push-receipt'
            ? t('diagnostics.receiptCheckRetryFailed')
            : t('diagnostics.jobRequeueFailed'),
      );
    } finally {
      setActiveRetryKey(null);
    }
  }

  const filteredExports = useMemo(
    () =>
      exportsData.filter((job) => {
        const matchesStatus = exportStatusFilter === 'ALL' || job.status === exportStatusFilter;
        const search = exportSearch.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          (job.fileName ?? `${job.type} ${job.format}`).toLowerCase().includes(search) ||
          (job.errorMessage ?? '').toLowerCase().includes(search);
        return matchesStatus && matchesSearch;
      }),
    [exportsData, exportSearch, exportStatusFilter],
  );
  const failedFilteredExports = useMemo(() => filteredExports.filter((job) => job.status === 'FAILED'), [filteredExports]);

  const filteredBiometricJobs = useMemo(
    () =>
      biometricJobs.filter((job) => {
        const matchesStatus = biometricStatusFilter === 'ALL' || job.status === biometricStatusFilter;
        const search = biometricSearch.trim().toLowerCase();
        const fullName = `${job.employee.firstName} ${job.employee.lastName} ${job.employee.employeeNumber}`.toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          fullName.includes(search) ||
          (job.errorMessage ?? '').toLowerCase().includes(search);
        return matchesStatus && matchesSearch;
      }),
    [biometricJobs, biometricSearch, biometricStatusFilter],
  );
  const failedFilteredBiometricJobs = useMemo(
    () => filteredBiometricJobs.filter((job) => job.status === 'FAILED'),
    [filteredBiometricJobs],
  );

  const filteredPushDeliveries = useMemo(
    () =>
      pushDeliveries.filter((delivery) => {
        const matchesStatus = pushStatusFilter === 'ALL' || delivery.status === pushStatusFilter;
        const matchesReceipt = pushReceiptFilter === 'ALL' || delivery.receiptStatus === pushReceiptFilter;
        const search = pushSearch.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          delivery.title.toLowerCase().includes(search) ||
          delivery.user.email.toLowerCase().includes(search) ||
          (delivery.errorMessage ?? '').toLowerCase().includes(search);
        return matchesStatus && matchesReceipt && matchesSearch;
      }),
    [pushDeliveries, pushReceiptFilter, pushSearch, pushStatusFilter],
  );
  const failedFilteredPushDeliveries = useMemo(
    () => filteredPushDeliveries.filter((delivery) => delivery.status === 'FAILED'),
    [filteredPushDeliveries],
  );
  const receiptErrorFilteredPushDeliveries = useMemo(
    () => filteredPushDeliveries.filter((delivery) => delivery.status === 'DELIVERED' && delivery.receiptStatus === 'ERROR'),
    [filteredPushDeliveries],
  );

  function toggleSelection(setter: Dispatch<SetStateAction<string[]>>, id: string) {
    setter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function replaceSelection(setter: Dispatch<SetStateAction<string[]>>, ids: string[]) {
    setter(ids);
  }

  const flatInputClass =
    'h-11 w-full border-b border-[color:var(--border)] bg-transparent px-0 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)]';
  const flatSelectClass =
    'h-11 w-full border-b border-[color:var(--border)] bg-transparent px-0 text-sm text-[color:var(--foreground)] outline-none';
  const flatButtonClass =
    'inline-flex h-10 items-center justify-center border border-[color:var(--border)] px-4 text-sm text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]';
  const flatPrimaryButtonClass =
    'inline-flex h-10 items-center justify-center bg-[color:var(--accent)] px-4 text-sm text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-50';
  const flatListClass = 'grid gap-0 border-t border-[color:var(--border)]';

  return (
    <AdminShell>
      <main className="flex w-full flex-col gap-8 px-5 py-6 lg:px-8">
        <section className="border-b border-[color:var(--border)] pb-5">
          <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
            Diagnostics
          </h1>
        </section>

        {message ? (
          <div className="border-b border-t border-[color:var(--border)] py-3 text-sm text-[color:var(--foreground)]">
            {message}
          </div>
        ) : null}

        {summary ? (
          <>
            <section className="grid gap-x-6 gap-y-5 border-b border-[color:var(--border)] pb-8 md:grid-cols-3 xl:grid-cols-5">
              <article className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.criticalAnomalies')}</span>
                <strong className="text-3xl font-semibold text-[color:var(--foreground)]">{summary.signals.criticalAnomaliesToday}</strong>
              </article>
              <article className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.pendingBiometricReviews')}</span>
                <strong className="text-3xl font-semibold text-[color:var(--foreground)]">{summary.signals.pendingBiometricReviews}</strong>
              </article>
              <article className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.failedExports24h')}</span>
                <strong className="text-3xl font-semibold text-[color:var(--foreground)]">{summary.signals.exportFailures24h}</strong>
              </article>
              <article className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.failedBiometricJobs24h')}</span>
                <strong className="text-3xl font-semibold text-[color:var(--foreground)]">{summary.signals.biometricFailures24h}</strong>
              </article>
              <article className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.failedPush24h')}</span>
                <strong className="text-3xl font-semibold text-[color:var(--foreground)]">{summary.signals.pushFailures24h}</strong>
              </article>
            </section>

            <section className="grid gap-8 border-b border-[color:var(--border)] pb-10 lg:grid-cols-3">
              <article className="grid gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{t('diagnostics.exportJobs')}</h2>
                <div className={flatListClass}>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.queued')}</span><strong>{summary.queues.exports.queued}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.processing')}</span><strong>{summary.queues.exports.processing}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.failed')}</span><strong>{summary.queues.exports.failed}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.completed')}</span><strong>{summary.queues.exports.completed}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.oldestQueued')}</span><strong>{summary.queues.exports.oldestQueuedMinutes} min</strong></div>
                </div>
              </article>

              <article className="grid gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{t('diagnostics.biometricJobs')}</h2>
                <div className={flatListClass}>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.queued')}</span><strong>{summary.queues.biometric.queued}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.processing')}</span><strong>{summary.queues.biometric.processing}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.failed')}</span><strong>{summary.queues.biometric.failed}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.completed')}</span><strong>{summary.queues.biometric.completed}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.oldestQueued')}</span><strong>{summary.queues.biometric.oldestQueuedMinutes} min</strong></div>
                </div>
              </article>

              <article className="grid gap-4">
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{t('diagnostics.pushDeliveries')}</h2>
                <div className={flatListClass}>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.queued')}</span><strong>{summary.queues.push.queued}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.processing')}</span><strong>{summary.queues.push.processing}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.failed')}</span><strong>{summary.queues.push.failed}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.delivered')}</span><strong>{summary.queues.push.delivered}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.pendingReceipts')}</span><strong>{summary.queues.push.pendingReceipts}</strong></div>
                  <div className="flex items-center justify-between border-b border-[color:var(--border)] py-3"><span>{t('diagnostics.receiptErrors')}</span><strong>{summary.queues.push.receiptErrors}</strong></div>
                </div>
              </article>
            </section>

            <section className="grid gap-4 border-b border-[color:var(--border)] pb-10">
              <div className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('diagnostics.queueAlerts')}</span>
                <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('dashboard.alerts')}</h2>
              </div>
              <div className="grid gap-0 border-t border-[color:var(--border)]">
                {summary.alerts.length > 0 ? summary.alerts.map((alert) => (
                  <div className={`grid gap-1 border-b border-[color:var(--border)] py-4 ${alert.severity === 'critical' ? 'text-[color:var(--danger)]' : ''}`} key={alert.id}>
                    <strong>{alert.title}</strong>
                    <span className="text-sm text-[color:var(--muted-foreground)]">{alert.detail}</span>
                  </div>
                )) : <div className="py-6 text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.noAlerts')}</div>}
              </div>
            </section>

            <section className="grid gap-6 border-b border-[color:var(--border)] pb-10">
              <div className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('diagnostics.policyTitle')}</span>
                <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('diagnostics.policySubtitle')}</h2>
              </div>
              {policy ? (
                <form className="grid gap-6" onSubmit={(event) => void handlePolicySubmit(event)}>
                  <fieldset className="grid gap-4 sm:grid-cols-2" disabled={!canManagePolicy}>
                    <input className={flatInputClass} defaultValue={policy.exportQueueWarningMinutes} name="exportQueueWarningMinutes" placeholder={t('diagnostics.exportQueueWarningMinutes')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.exportQueueCriticalMinutes} name="exportQueueCriticalMinutes" placeholder={t('diagnostics.exportQueueCriticalMinutes')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.biometricQueueWarningMinutes} name="biometricQueueWarningMinutes" placeholder={t('diagnostics.biometricQueueWarningMinutes')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.biometricQueueCriticalMinutes} name="biometricQueueCriticalMinutes" placeholder={t('diagnostics.biometricQueueCriticalMinutes')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.exportFailureWarningCount24h} name="exportFailureWarningCount24h" placeholder={t('diagnostics.exportFailureWarningCount24h')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.biometricFailureWarningCount24h} name="biometricFailureWarningCount24h" placeholder={t('diagnostics.biometricFailureWarningCount24h')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.pushFailureCriticalCount24h} name="pushFailureCriticalCount24h" placeholder={t('diagnostics.pushFailureCriticalCount24h')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.pushReceiptErrorCriticalCount} name="pushReceiptErrorCriticalCount" placeholder={t('diagnostics.pushReceiptErrorCriticalCount')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.criticalAnomaliesCriticalCount} name="criticalAnomaliesCriticalCount" placeholder={t('diagnostics.criticalAnomaliesCriticalCount')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.pendingBiometricReviewWarningCount} name="pendingBiometricReviewWarningCount" placeholder={t('diagnostics.pendingBiometricReviewWarningCount')} required type="number" />
                    <input className={flatInputClass} defaultValue={policy.repeatIntervalMinutes} name="repeatIntervalMinutes" placeholder={t('diagnostics.repeatIntervalMinutes')} required type="number" />
                    <label className="flex items-center gap-3 py-2 text-sm">
                      <input defaultChecked={policy.notifyTenantOwner} name="notifyTenantOwner" type="checkbox" />
                      <span>{t('diagnostics.notifyTenantOwner')}</span>
                    </label>
                    <label className="flex items-center gap-3 py-2 text-sm">
                      <input defaultChecked={policy.notifyHrAdmin} name="notifyHrAdmin" type="checkbox" />
                      <span>{t('diagnostics.notifyHrAdmin')}</span>
                    </label>
                    <label className="flex items-center gap-3 py-2 text-sm">
                      <input defaultChecked={policy.notifyOperationsAdmin} name="notifyOperationsAdmin" type="checkbox" />
                      <span>{t('diagnostics.notifyOperationsAdmin')}</span>
                    </label>
                    <label className="flex items-center gap-3 py-2 text-sm">
                      <input defaultChecked={policy.notifyManagers} name="notifyManagers" type="checkbox" />
                      <span>{t('diagnostics.notifyManagers')}</span>
                    </label>
                  </fieldset>
                  {canManagePolicy ? <button className={flatPrimaryButtonClass} type="submit">{t('diagnostics.savePolicy')}</button> : null}
                </form>
              ) : null}
            </section>

            <section className="grid gap-6 border-b border-[color:var(--border)] pb-10">
              <div className="grid gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('diagnostics.trendsTitle')}</span>
                <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('diagnostics.trendsSubtitle')}</h2>
              </div>
              {trends && trends.snapshots.length > 0 ? (
                <div className="grid gap-8">
                  <section className="grid gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
                    <article className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.snapshots')}</span>
                      <strong className="font-heading text-5xl text-[color:var(--foreground)]">{trends.totals.snapshots}</strong>
                    </article>
                    <article className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.maxExportQueueAge')}</span>
                      <strong className="font-heading text-5xl text-[color:var(--foreground)]">{trends.totals.maxExportQueueAge}m</strong>
                    </article>
                    <article className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.maxBiometricQueueAge')}</span>
                      <strong className="font-heading text-5xl text-[color:var(--foreground)]">{trends.totals.maxBiometricQueueAge}m</strong>
                    </article>
                    <article className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.maxPushReceiptErrors')}</span>
                      <strong className="font-heading text-5xl text-[color:var(--foreground)]">{trends.totals.maxPushReceiptErrors}</strong>
                    </article>
                    <article className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">{t('diagnostics.slaBreaches')}</span>
                      <strong className="font-heading text-5xl text-[color:var(--foreground)]">{trends.totals.slaBreaches}</strong>
                    </article>
                  </section>

                  <div className="grid gap-0 border-t border-[color:var(--border)]">
                    {trends.snapshots.map((snapshot) => (
                      <div className="grid gap-4 border-b border-[color:var(--border)] py-4" key={snapshot.capturedAt}>
                        <div className="grid gap-1">
                          <strong>{new Date(snapshot.capturedAt).toLocaleString(localeTag)}</strong>
                          <span className="text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.capturedAt')}</span>
                        </div>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-[90px_minmax(0,1fr)_50px] items-center gap-3">
                            <span>Export</span>
                            <div className="h-2 bg-[color:var(--panel-muted)]">
                              <div className="h-full bg-[color:var(--accent)]" style={{ width: `${Math.min(100, snapshot.exportOldestQueuedMinutes * 4)}%` }} />
                            </div>
                            <strong>{snapshot.exportOldestQueuedMinutes}m</strong>
                          </div>
                          <div className="grid grid-cols-[90px_minmax(0,1fr)_50px] items-center gap-3">
                            <span>Biometric</span>
                            <div className="h-2 bg-[color:var(--panel-muted)]">
                              <div className="h-full bg-[color:var(--success)]" style={{ width: `${Math.min(100, snapshot.biometricOldestQueuedMinutes * 4)}%` }} />
                            </div>
                            <strong>{snapshot.biometricOldestQueuedMinutes}m</strong>
                          </div>
                          <div className="grid grid-cols-[90px_minmax(0,1fr)_50px] items-center gap-3">
                            <span>Push</span>
                            <div className="h-2 bg-[color:var(--panel-muted)]">
                              <div className="h-full bg-[color:var(--warning)]" style={{ width: `${Math.min(100, snapshot.pushReceiptErrors * 20)}%` }} />
                            </div>
                            <strong>{snapshot.pushReceiptErrors}</strong>
                          </div>
                          <div className="grid grid-cols-[90px_minmax(0,1fr)_50px] items-center gap-3">
                            <span>Alerts</span>
                            <div className="h-2 bg-[color:var(--panel-muted)]">
                              <div className="h-full bg-[color:var(--danger)]" style={{ width: `${Math.min(100, snapshot.criticalAlerts * 20)}%` }} />
                            </div>
                            <strong>{snapshot.criticalAlerts}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.noTrends')}</div>
              )}
            </section>
          </>
        ) : null}

        <section className="grid gap-10 lg:grid-cols-2">
          <article className="grid gap-4" id="diagnostics-exports">
            <div className="grid gap-1">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('exports.title')}</span>
              <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('diagnostics.exportJobs')}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={flatInputClass} onChange={(event) => { setExportSearch(event.target.value); setExportPage(1); }} placeholder={t('diagnostics.searchJobs')} value={exportSearch} />
              <AppSelectField
                className={flatSelectClass}
                value={exportStatusFilter}
                onValueChange={(value) => { setExportStatusFilter(value as 'ALL' | ExportJobsResponse['items'][number]['status']); setExportPage(1); }}
                options={[
                  { value: 'ALL', label: t('diagnostics.allStatuses') },
                  { value: 'FAILED', label: 'FAILED' },
                  { value: 'QUEUED', label: 'QUEUED' },
                  { value: 'PROCESSING', label: 'PROCESSING' },
                  { value: 'COMPLETED', label: 'COMPLETED' },
                ]}
              />
            </div>
            {canOperateQueues ? (
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    checked={failedFilteredExports.length > 0 && failedFilteredExports.every((job) => selectedExportIds.includes(job.id))}
                    onChange={(event) =>
                      replaceSelection(
                        setSelectedExportIds,
                        event.target.checked ? failedFilteredExports.map((job) => job.id) : [],
                      )
                    }
                    type="checkbox"
                  />
                  <span>{t('diagnostics.selectFiltered')}</span>
                </label>
                <button
                  className={flatButtonClass}
                  disabled={selectedExportIds.length === 0 || activeRetryKey === 'export:bulk'}
                  onClick={() => void handleBulkAction('export', selectedExportIds)}
                  type="button"
                >
                  {activeRetryKey === 'export:bulk' ? t('diagnostics.requeueing') : t('diagnostics.bulkRequeue')}
                </button>
              </div>
            ) : null}
            <div className="grid gap-0 border-t border-[color:var(--border)]">
              {filteredExports.length > 0 ? filteredExports.map((job) => (
                <div className="grid gap-2 border-b border-[color:var(--border)] py-4" key={job.id}>
                  {canOperateQueues && job.status === 'FAILED' ? (
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        checked={selectedExportIds.includes(job.id)}
                        onChange={() => toggleSelection(setSelectedExportIds, job.id)}
                        type="checkbox"
                      />
                      <span>{t('diagnostics.selectItem')}</span>
                    </label>
                  ) : null}
                  <strong>{job.fileName ?? `${job.type} • ${job.format.toUpperCase()}`}</strong>
                  <span>{job.status}</span>
                  <span>{new Date(job.createdAt).toLocaleString(localeTag)}</span>
                  {job.downloadUrl ? (
                    <a className="inline-link" href={job.downloadUrl} rel="noreferrer" target="_blank">
                      {t('exports.downloadResult')}
                    </a>
                  ) : null}
                  {canOperateQueues && job.status === 'FAILED' ? (
                    <button
                      className={flatButtonClass}
                      disabled={activeRetryKey === `export:${job.id}`}
                      onClick={() => void handleRetry('export', job.id)}
                      type="button"
                    >
                      {activeRetryKey === `export:${job.id}` ? t('diagnostics.requeueing') : t('diagnostics.requeue')}
                    </button>
                  ) : null}
                  {job.errorMessage ? <span>{job.errorMessage}</span> : null}
                </div>
              )) : <div className="py-6 text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.noExportJobs')}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[color:var(--muted-foreground)]">{t('diagnostics.paginationLabel')} {exportMeta.page}/{exportMeta.totalPages} • {exportMeta.total}</span>
              <button className={flatButtonClass} disabled={exportMeta.page <= 1} onClick={() => setExportPage((current) => Math.max(1, current - 1))} type="button">{t('diagnostics.previousPage')}</button>
              <button className={flatButtonClass} disabled={exportMeta.page >= exportMeta.totalPages} onClick={() => setExportPage((current) => current + 1)} type="button">{t('diagnostics.nextPage')}</button>
            </div>
          </article>

          <article className="grid gap-4" id="diagnostics-biometric">
            <div className="grid gap-1">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('biometric.eyebrow')}</span>
              <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('diagnostics.biometricJobs')}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={flatInputClass} onChange={(event) => { setBiometricSearch(event.target.value); setBiometricPage(1); }} placeholder={t('diagnostics.searchJobs')} value={biometricSearch} />
              <AppSelectField
                className={flatSelectClass}
                value={biometricStatusFilter}
                onValueChange={(value) => { setBiometricStatusFilter(value as 'ALL' | TeamBiometricJobsResponse['items'][number]['status']); setBiometricPage(1); }}
                options={[
                  { value: 'ALL', label: t('diagnostics.allStatuses') },
                  { value: 'FAILED', label: 'FAILED' },
                  { value: 'QUEUED', label: 'QUEUED' },
                  { value: 'PROCESSING', label: 'PROCESSING' },
                  { value: 'COMPLETED', label: 'COMPLETED' },
                ]}
              />
            </div>
            {canOperateQueues ? (
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    checked={failedFilteredBiometricJobs.length > 0 && failedFilteredBiometricJobs.every((job) => selectedBiometricIds.includes(job.id))}
                    onChange={(event) =>
                      replaceSelection(
                        setSelectedBiometricIds,
                        event.target.checked ? failedFilteredBiometricJobs.map((job) => job.id) : [],
                      )
                    }
                    type="checkbox"
                  />
                  <span>{t('diagnostics.selectFiltered')}</span>
                </label>
                <button
                  className={flatButtonClass}
                  disabled={selectedBiometricIds.length === 0 || activeRetryKey === 'biometric:bulk'}
                  onClick={() => void handleBulkAction('biometric', selectedBiometricIds)}
                  type="button"
                >
                  {activeRetryKey === 'biometric:bulk' ? t('diagnostics.requeueing') : t('diagnostics.bulkRequeue')}
                </button>
              </div>
            ) : null}
            <div className="grid gap-0 border-t border-[color:var(--border)]">
              {filteredBiometricJobs.length > 0 ? filteredBiometricJobs.map((job) => (
                <div className="grid gap-2 border-b border-[color:var(--border)] py-4" key={job.id}>
                  {canOperateQueues && job.status === 'FAILED' ? (
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        checked={selectedBiometricIds.includes(job.id)}
                        onChange={() => toggleSelection(setSelectedBiometricIds, job.id)}
                        type="checkbox"
                      />
                      <span>{t('diagnostics.selectItem')}</span>
                    </label>
                  ) : null}
                  <strong>{job.employee.firstName} {job.employee.lastName} ({job.employee.employeeNumber})</strong>
                  <span>{job.type}</span>
                  <span>{job.status}</span>
                  <span>{new Date(job.createdAt).toLocaleString(localeTag)}</span>
                  {job.result ? <span>{job.result.result}</span> : null}
                  {canOperateQueues && job.status === 'FAILED' ? (
                    <button
                      className={flatButtonClass}
                      disabled={activeRetryKey === `biometric:${job.id}`}
                      onClick={() => void handleRetry('biometric', job.id)}
                      type="button"
                    >
                      {activeRetryKey === `biometric:${job.id}` ? t('diagnostics.requeueing') : t('diagnostics.requeue')}
                    </button>
                  ) : null}
                  {job.errorMessage ? <span>{job.errorMessage}</span> : null}
                </div>
              )) : <div className="py-6 text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.noBiometricJobs')}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[color:var(--muted-foreground)]">{t('diagnostics.paginationLabel')} {biometricMeta.page}/{biometricMeta.totalPages} • {biometricMeta.total}</span>
              <button className={flatButtonClass} disabled={biometricMeta.page <= 1} onClick={() => setBiometricPage((current) => Math.max(1, current - 1))} type="button">{t('diagnostics.previousPage')}</button>
              <button className={flatButtonClass} disabled={biometricMeta.page >= biometricMeta.totalPages} onClick={() => setBiometricPage((current) => current + 1)} type="button">{t('diagnostics.nextPage')}</button>
            </div>
          </article>

          <article className="grid gap-4 lg:col-span-2" id="diagnostics-push">
            <div className="grid gap-1">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{t('diagnostics.provider')}</span>
              <h2 className="font-heading text-3xl font-bold text-[color:var(--foreground)]">{t('diagnostics.pushDeliveries')}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input className={flatInputClass} onChange={(event) => { setPushSearch(event.target.value); setPushPage(1); }} placeholder={t('diagnostics.searchDeliveries')} value={pushSearch} />
              <AppSelectField
                className={flatSelectClass}
                value={pushStatusFilter}
                onValueChange={(value) => { setPushStatusFilter(value as 'ALL' | PushDeliveryItem['status']); setPushPage(1); }}
                options={[
                  { value: 'ALL', label: t('diagnostics.allStatuses') },
                  { value: 'FAILED', label: 'FAILED' },
                  { value: 'QUEUED', label: 'QUEUED' },
                  { value: 'PROCESSING', label: 'PROCESSING' },
                  { value: 'DELIVERED', label: 'DELIVERED' },
                ]}
              />
              <AppSelectField
                className={flatSelectClass}
                value={pushReceiptFilter}
                onValueChange={(value) => { setPushReceiptFilter(value as 'ALL' | NonNullable<PushDeliveryItem['receiptStatus']>); setPushPage(1); }}
                options={[
                  { value: 'ALL', label: t('diagnostics.allReceiptStatuses') },
                  { value: 'ERROR', label: 'ERROR' },
                  { value: 'PENDING', label: 'PENDING' },
                  { value: 'OK', label: 'OK' },
                ]}
              />
            </div>
            {canOperateQueues ? (
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    checked={failedFilteredPushDeliveries.length > 0 && failedFilteredPushDeliveries.every((delivery) => selectedPushIds.includes(delivery.id))}
                    onChange={(event) =>
                      replaceSelection(
                        setSelectedPushIds,
                        event.target.checked ? failedFilteredPushDeliveries.map((delivery) => delivery.id) : [],
                      )
                    }
                    type="checkbox"
                  />
                  <span>{t('diagnostics.selectFailed')}</span>
                </label>
                <button
                  className={flatButtonClass}
                  disabled={selectedPushIds.length === 0 || activeRetryKey === 'push:bulk'}
                  onClick={() => void handleBulkAction('push', selectedPushIds)}
                  type="button"
                >
                  {activeRetryKey === 'push:bulk' ? t('diagnostics.requeueing') : t('diagnostics.bulkRequeue')}
                </button>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    checked={receiptErrorFilteredPushDeliveries.length > 0 && receiptErrorFilteredPushDeliveries.every((delivery) => selectedPushReceiptIds.includes(delivery.id))}
                    onChange={(event) =>
                      replaceSelection(
                        setSelectedPushReceiptIds,
                        event.target.checked ? receiptErrorFilteredPushDeliveries.map((delivery) => delivery.id) : [],
                      )
                    }
                    type="checkbox"
                  />
                  <span>{t('diagnostics.selectReceiptErrors')}</span>
                </label>
                <button
                  className={flatButtonClass}
                  disabled={selectedPushReceiptIds.length === 0 || activeRetryKey === 'push-receipt:bulk'}
                  onClick={() => void handleBulkAction('push-receipt', selectedPushReceiptIds)}
                  type="button"
                >
                  {activeRetryKey === 'push-receipt:bulk' ? t('diagnostics.requeueing') : t('diagnostics.bulkRetryReceiptCheck')}
                </button>
              </div>
            ) : null}
            <div className="grid gap-0 border-t border-[color:var(--border)]">
              {filteredPushDeliveries.length > 0 ? filteredPushDeliveries.map((delivery) => (
                <div className="grid gap-2 border-b border-[color:var(--border)] py-4" key={delivery.id}>
                  {canOperateQueues && (delivery.status === 'FAILED' || (delivery.status === 'DELIVERED' && delivery.receiptStatus === 'ERROR')) ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {delivery.status === 'FAILED' ? (
                        <label className="flex items-center gap-3 text-sm">
                          <input
                            checked={selectedPushIds.includes(delivery.id)}
                            onChange={() => toggleSelection(setSelectedPushIds, delivery.id)}
                            type="checkbox"
                          />
                          <span>{t('diagnostics.selectItem')}</span>
                        </label>
                      ) : null}
                      {delivery.status === 'DELIVERED' && delivery.receiptStatus === 'ERROR' ? (
                        <label className="flex items-center gap-3 text-sm">
                          <input
                            checked={selectedPushReceiptIds.includes(delivery.id)}
                            onChange={() => toggleSelection(setSelectedPushReceiptIds, delivery.id)}
                            type="checkbox"
                          />
                          <span>{t('diagnostics.selectReceipt')}</span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                  <strong>{delivery.title}</strong>
                  <span>{delivery.user.email}</span>
                  <span>{delivery.status}</span>
                  <span>{t('diagnostics.receiptStatus')}: {delivery.receiptStatus ?? '—'}</span>
                  <span>{new Date(delivery.createdAt).toLocaleString(localeTag)}</span>
                  {canOperateQueues && delivery.status === 'FAILED' ? (
                    <button
                      className={flatButtonClass}
                      disabled={activeRetryKey === `push:${delivery.id}`}
                      onClick={() => void handleRetry('push', delivery.id)}
                      type="button"
                    >
                      {activeRetryKey === `push:${delivery.id}` ? t('diagnostics.requeueing') : t('diagnostics.requeue')}
                    </button>
                  ) : null}
                  {canOperateQueues && delivery.status === 'DELIVERED' && delivery.receiptStatus === 'ERROR' ? (
                    <button
                      className={flatButtonClass}
                      disabled={activeRetryKey === `push-receipt:${delivery.id}`}
                      onClick={() => void handleRetry('push-receipt', delivery.id)}
                      type="button"
                    >
                      {activeRetryKey === `push-receipt:${delivery.id}` ? t('diagnostics.requeueing') : t('diagnostics.retryReceiptCheck')}
                    </button>
                  ) : null}
                  {delivery.errorMessage ? <span>{delivery.errorMessage}</span> : null}
                </div>
              )) : <div className="py-6 text-sm text-[color:var(--muted-foreground)]">{t('diagnostics.noPushDeliveries')}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[color:var(--muted-foreground)]">{t('diagnostics.paginationLabel')} {pushMeta.page}/{pushMeta.totalPages} • {pushMeta.total}</span>
              <button className={flatButtonClass} disabled={pushMeta.page <= 1} onClick={() => setPushPage((current) => Math.max(1, current - 1))} type="button">{t('diagnostics.previousPage')}</button>
              <button className={flatButtonClass} disabled={pushMeta.page >= pushMeta.totalPages} onClick={() => setPushPage((current) => current + 1)} type="button">{t('diagnostics.nextPage')}</button>
            </div>
          </article>
        </section>
      </main>
    </AdminShell>
  );
}
