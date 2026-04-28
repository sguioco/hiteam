'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type {
  ExportJobsResponse,
  HolidayCalendarDay,
  PayrollPolicy,
  PayrollSummaryResponse,
} from '@smart/types';
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  MoonStar,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { Table } from '@/components/application/table/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiDownload, apiRequest } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

type NoticeState = { text: string; tone: 'error' | 'success' } | null;

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}
function formatMoney(value: number) {
  return value.toFixed(2);
}
function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function getJobStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'FAILED': return 'danger';
    case 'PROCESSING': return 'default';
    default: return 'warning';
  }
}

export type PayrollPageInitialData = {
  exportJobs: ExportJobsResponse['items'];
  holidays: HolidayCalendarDay[];
  policy: PayrollPolicy | null;
  summary: PayrollSummaryResponse | null;
};

export default function PayrollPageClient({
  initialData,
}: {
  initialData?: PayrollPageInitialData | null;
}) {
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState<PayrollSummaryResponse | null>(initialData?.summary ?? null);
  const [policy, setPolicy] = useState<PayrollPolicy | null>(initialData?.policy ?? null);
  const [holidays, setHolidays] = useState<HolidayCalendarDay[]>(initialData?.holidays ?? []);
  const [exportJobs, setExportJobs] = useState<ExportJobsResponse['items']>(initialData?.exportJobs ?? []);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'policy' | 'holidays' | 'exports'>('summary');
  const didUseInitialData = useRef(Boolean(initialData));

  const payrollTabs: Array<{ value: typeof activeTab; label: string }> = [
    { value: 'summary', label: locale === 'ru' ? 'Сводка' : 'Summary' },
    { value: 'policy', label: locale === 'ru' ? 'Политика' : 'Policy' },
    { value: 'holidays', label: locale === 'ru' ? 'Праздники' : 'Holidays' },
    { value: 'exports', label: locale === 'ru' ? 'Экспорт' : 'Export' },
  ];

  async function loadData() {
    const session = getSession();
    if (!session) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [sd, pd, hd, ed] = await Promise.all([
        apiRequest<PayrollSummaryResponse>('/payroll/summary', { token: session.accessToken }),
        apiRequest<PayrollPolicy>('/payroll/policy', { token: session.accessToken }),
        apiRequest<HolidayCalendarDay[]>('/payroll/holidays', { token: session.accessToken }),
        apiRequest<ExportJobsResponse>('/exports/jobs?type=PAYROLL_SUMMARY', { token: session.accessToken }),
      ]);
      setSummary(sd); setPolicy(pd); setHolidays(hd); setExportJobs(ed.items);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    } finally { setIsLoading(false); }
  }

  useEffect(() => {
    if (didUseInitialData.current) {
      didUseInitialData.current = false;
      setIsLoading(false);
      return;
    }

    void loadData();
  }, []);

  async function handlePolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    const fd = new FormData(event.currentTarget);
    try {
      const next = await apiRequest<PayrollPolicy>('/payroll/policy', {
        method: 'POST', token: session.accessToken,
        body: JSON.stringify({
          baseHourlyRate: Number(fd.get('baseHourlyRate')),
          overtimeMultiplier: Number(fd.get('overtimeMultiplier')),
          weekendMultiplier: Number(fd.get('weekendMultiplier')),
          weekendOvertimeMultiplier: Number(fd.get('weekendOvertimeMultiplier')),
          holidayMultiplier: Number(fd.get('holidayMultiplier')),
          holidayOvertimeMultiplier: Number(fd.get('holidayOvertimeMultiplier')),
          nightPremiumMultiplier: Number(fd.get('nightPremiumMultiplier')),
          nightShiftStartLocal: fd.get('nightShiftStartLocal'),
          nightShiftEndLocal: fd.get('nightShiftEndLocal'),
          latenessPenaltyPerMinute: Number(fd.get('latenessPenaltyPerMinute')),
          earlyLeavePenaltyPerMinute: Number(fd.get('earlyLeavePenaltyPerMinute')),
          leavePaidRatio: Number(fd.get('leavePaidRatio')),
          sickLeavePaidRatio: Number(fd.get('sickLeavePaidRatio')),
          standardShiftMinutes: Number(fd.get('standardShiftMinutes')),
          breaksEnabled: fd.has('breaksEnabled')
            ? fd.get('breaksEnabled') === 'on'
            : (policy?.breaksEnabled ?? false),
          defaultBreakIsPaid: fd.has('defaultBreakIsPaid')
            ? fd.get('defaultBreakIsPaid') === 'on'
            : (policy?.defaultBreakIsPaid ?? false),
          maxBreakMinutes: fd.has('maxBreakMinutes')
            ? Number(fd.get('maxBreakMinutes'))
            : (policy?.maxBreakMinutes ?? 0),
          mandatoryBreakThresholdMinutes: fd.has('mandatoryBreakThresholdMinutes')
            ? Number(fd.get('mandatoryBreakThresholdMinutes'))
            : (policy?.mandatoryBreakThresholdMinutes ?? 0),
          mandatoryBreakDurationMinutes: fd.has('mandatoryBreakDurationMinutes')
            ? Number(fd.get('mandatoryBreakDurationMinutes'))
            : (policy?.mandatoryBreakDurationMinutes ?? 0),
        }),
      });
      setPolicy(next);
      setNotice({ text: t('payroll.policySaved'), tone: 'success' });
      await loadData();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    }
  }

  async function handleHolidaySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    const fd = new FormData(event.currentTarget);
    try {
      await apiRequest('/payroll/holidays', {
        method: 'POST', token: session.accessToken,
        body: JSON.stringify({ name: fd.get('name'), date: fd.get('date'), isPaid: fd.get('isPaid') === 'on' }),
      });
      event.currentTarget.reset();
      setNotice({ text: t('payroll.holidaySaved'), tone: 'success' });
      await loadData();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    }
  }

  async function deleteHoliday(holidayId: string) {
    const session = getSession();
    if (!session) return;
    try {
      await apiRequest(`/payroll/holidays/${holidayId}`, { method: 'DELETE', token: session.accessToken });
      setNotice({ text: t('payroll.holidayDeleted'), tone: 'success' });
      await loadData();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    }
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    const session = getSession();
    if (!session) return;
    setIsExporting(true);
    try {
      const { blob, fileName } = await apiDownload(`/payroll/export?format=${format}`, { token: session.accessToken });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = fileName ?? `payroll-export.${format}`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      setNotice({ text: t('payroll.exportReady'), tone: 'success' });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    } finally { setIsExporting(false); }
  }

  async function handleAsyncExport(format: 'csv' | 'xlsx' | 'pdf') {
    const session = getSession();
    if (!session) return;
    try {
      await apiRequest('/exports/payroll', { method: 'POST', token: session.accessToken, body: JSON.stringify({ format }) });
      setNotice({ text: t('exports.jobQueued'), tone: 'success' });
      await loadData();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : t('common.noData'), tone: 'error' });
    }
  }

  const primaryPolicyFields = policy ? [
    { name: 'baseHourlyRate', label: t('payroll.baseRate'), step: '0.01', type: 'number', value: policy.baseHourlyRate },
    { name: 'overtimeMultiplier', label: t('payroll.overtimeMultiplier'), step: '0.01', type: 'number', value: policy.overtimeMultiplier },
    { name: 'weekendMultiplier', label: t('payroll.weekendMultiplier'), step: '0.01', type: 'number', value: policy.weekendMultiplier },
    { name: 'weekendOvertimeMultiplier', label: t('payroll.weekendOvertimeMultiplier'), step: '0.01', type: 'number', value: policy.weekendOvertimeMultiplier },
    { name: 'holidayMultiplier', label: t('payroll.holidayMultiplier'), step: '0.01', type: 'number', value: policy.holidayMultiplier },
    { name: 'holidayOvertimeMultiplier', label: t('payroll.holidayOvertimeMultiplier'), step: '0.01', type: 'number', value: policy.holidayOvertimeMultiplier },
    { name: 'nightPremiumMultiplier', label: t('payroll.nightPremiumMultiplier'), step: '0.01', type: 'number', value: policy.nightPremiumMultiplier },
    { name: 'standardShiftMinutes', label: t('payroll.standardShift'), type: 'number', value: policy.standardShiftMinutes },
  ] : [];

  const rulePolicyFields = policy ? [
    { name: 'nightShiftStartLocal', label: t('payroll.nightShiftStart'), type: 'time', value: policy.nightShiftStartLocal },
    { name: 'nightShiftEndLocal', label: t('payroll.nightShiftEnd'), type: 'time', value: policy.nightShiftEndLocal },
    { name: 'latenessPenaltyPerMinute', label: t('payroll.latenessPenalty'), step: '0.01', type: 'number', value: policy.latenessPenaltyPerMinute },
    { name: 'earlyLeavePenaltyPerMinute', label: t('payroll.earlyPenalty'), step: '0.01', type: 'number', value: policy.earlyLeavePenaltyPerMinute },
    { name: 'leavePaidRatio', label: t('payroll.leaveRatio'), step: '0.01', type: 'number', value: policy.leavePaidRatio },
    { name: 'sickLeavePaidRatio', label: t('payroll.sickRatio'), step: '0.01', type: 'number', value: policy.sickLeavePaidRatio },
  ] : [];

  /* ── Tab renderers ── */

  function renderSummaryTab() {
    if (!summary) return null;
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base">{t('payroll.rows')}</CardTitle><CardDescription>{t('payroll.title')}</CardDescription></div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('payroll.gross')}</p>
              <p className="text-2xl font-bold tabular-nums">{formatMoney(summary.totals.estimatedGrossPay)}</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="team-tasks-table-card !rounded-none !border-0">
              <div className="team-tasks-table-shell">
                <Table aria-label={t('payroll.rows')} size="sm">
                  <Table.Header>
                    <Table.Head
                      className="min-w-[280px]"
                      id="employeeName"
                      isRowHeader
                      label={t('employees.name')}
                    />
                    <Table.Head className="text-right [&>div]:justify-end" id="scheduled" label={t('payroll.scheduled')} />
                    <Table.Head className="text-right [&>div]:justify-end" id="worked" label={t('payroll.worked')} />
                    <Table.Head className="text-right [&>div]:justify-end" id="late" label={t('payroll.late')} />
                    <Table.Head className="text-right [&>div]:justify-end" id="night" label={t('payroll.night')} />
                    <Table.Head className="text-right [&>div]:justify-end" id="overtime" label={t('payroll.overtime')} />
                    <Table.Head className="text-right [&>div]:justify-end" id="gross" label={t('payroll.gross')} />
                  </Table.Header>
                  <Table.Body items={summary.rows}>
                    {(row) => (
                      <Table.Row className="team-tasks-table-row" id={row.employeeId}>
                        <Table.Cell>
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{row.employeeName}</span>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.department || row.position
                                ? `${row.department || '–'} / ${row.position || '–'}`
                                : row.employeeNumber}
                            </p>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{formatHours(row.scheduledMinutes)}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{formatHours(row.workedMinutes)}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{formatHours(row.lateMinutes)}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">{formatHours(row.nightMinutes)}</Table.Cell>
                        <Table.Cell className="text-right tabular-nums">
                          {formatHours(
                            row.overtimeMinutes + row.weekendOvertimeMinutes + row.holidayOvertimeMinutes,
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-right font-semibold tabular-nums">
                          {formatMoney(row.estimatedGrossPay)}
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('payroll.exportTitle')}</CardTitle><CardDescription>{t('payroll.exportSubtitle')}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" disabled={isExporting} onClick={() => void handleExport('xlsx')} type="button"><Download className="mr-2 h-4 w-4" />{isExporting ? t('payroll.exporting') : t('payroll.exportXlsx')}</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={isExporting} onClick={() => void handleExport('csv')} type="button" variant="outline" size="sm"><Download className="mr-1 h-3 w-3" /> CSV</Button>
                <Button disabled={isExporting} onClick={() => void handleExport('pdf')} type="button" variant="outline" size="sm"><Download className="mr-1 h-3 w-3" /> PDF</Button>
              </div>
              <Separator />
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{locale === 'ru' ? 'Фоновый экспорт' : 'Background export'}</p>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => void handleAsyncExport('xlsx')} type="button" variant="secondary" size="sm">XLSX</Button>
                <Button onClick={() => void handleAsyncExport('csv')} type="button" variant="secondary" size="sm">CSV</Button>
                <Button onClick={() => void handleAsyncExport('pdf')} type="button" variant="secondary" size="sm">PDF</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('exports.recentJobs')}</CardTitle></CardHeader>
            <CardContent>
              {exportJobs.length ? (
                <div className="divide-y">
                  {exportJobs.map((job) => (
                    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" key={job.id}>
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-medium">{job.fileName ?? `${job.type} / ${job.format.toUpperCase()}`}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(job.createdAt, locale)}</p>
                        {job.downloadUrl && <a className="text-xs font-medium text-primary hover:underline" href={job.downloadUrl} rel="noreferrer" target="_blank">{t('exports.downloadResult')}</a>}
                        {job.errorMessage && <p className="text-xs text-destructive">{job.errorMessage}</p>}
                      </div>
                      <Badge variant={getJobStatusVariant(job.status)} className="shrink-0">{job.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="py-4 text-center text-sm text-muted-foreground">{t('exports.noJobs')}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderPolicyTab() {
    if (!policy) return null;
    return (
      <form onSubmit={(e) => void handlePolicySubmit(e)}>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{locale === 'ru' ? 'Ставки и коэффициенты' : 'Rates & multipliers'}</CardTitle><CardDescription>{locale === 'ru' ? 'Основные параметры для расчёта.' : 'Base calculation settings.'}</CardDescription></CardHeader>
            <CardContent><div className="grid gap-4 sm:grid-cols-2">{primaryPolicyFields.map((f) => (<label className="space-y-1.5" key={f.name}><span className="text-xs font-medium text-muted-foreground">{f.label}</span><Input defaultValue={f.value} id={f.name} name={f.name} required step={f.step} type={f.type} /></label>))}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{locale === 'ru' ? 'Ограничения и удержания' : 'Rules & deductions'}</CardTitle><CardDescription>{locale === 'ru' ? 'Ночное окно и штрафы.' : 'Night window and penalties.'}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">{rulePolicyFields.map((f) => (<label className="space-y-1.5" key={f.name}><span className="text-xs font-medium text-muted-foreground">{f.label}</span><Input defaultValue={f.value} id={f.name} name={f.name} required step={f.step} type={f.type} /></label>))}</div>
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{locale === 'ru' ? 'Перерывы' : 'Breaks'}</CardTitle>
              <CardDescription>
                {locale === 'ru'
                  ? 'Включите функцию в компании, затем разрешите её нужным сотрудникам в карточке сотрудника.'
                  : 'Enable breaks company-wide, then allow them for specific employees in the employee card.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_repeat(3,minmax(140px,180px))]">
              <label className="flex min-h-[74px] items-center gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <input className="h-4 w-4 rounded border accent-primary" defaultChecked={policy.breaksEnabled} name="breaksEnabled" type="checkbox" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {locale === 'ru' ? 'Включить перерывы' : 'Enable breaks'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {locale === 'ru' ? 'Кнопка появится только у разрешённых сотрудников.' : 'The button appears only for allowed employees.'}
                  </span>
                </span>
              </label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{t('payroll.maxBreakMinutes')}</span><Input defaultValue={policy.maxBreakMinutes} min={1} name="maxBreakMinutes" required type="number" /></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{t('payroll.mandatoryBreakThreshold')}</span><Input defaultValue={policy.mandatoryBreakThresholdMinutes} min={1} name="mandatoryBreakThresholdMinutes" required type="number" /></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{t('payroll.mandatoryBreakDuration')}</span><Input defaultValue={policy.mandatoryBreakDurationMinutes} min={0} name="mandatoryBreakDurationMinutes" required type="number" /></label>
              <label className="flex items-center gap-2.5 text-sm md:col-span-4"><input className="h-4 w-4 rounded border accent-primary" defaultChecked={policy.defaultBreakIsPaid} name="defaultBreakIsPaid" type="checkbox" />{t('payroll.defaultBreakPaid')}</label>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4"><Button type="submit">{t('payroll.savePolicy')}</Button></CardFooter>
          </Card>
        </div>
      </form>
    );
  }

  function renderHolidaysTab() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('payroll.addHoliday')}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleHolidaySubmit(e)}>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-medium text-muted-foreground">{t('payroll.holidayName')}</span><Input name="name" required /></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{t('payroll.holidayDate')}</span><Input name="date" required type="date" /></label>
              <label className="flex items-center gap-2.5 pt-6 text-sm"><input className="h-4 w-4 rounded border accent-primary" defaultChecked name="isPaid" type="checkbox" />{t('payroll.holidayPaid')}</label>
              <div className="flex justify-end sm:col-span-2"><Button type="submit">{t('payroll.addHoliday')}</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{locale === 'ru' ? 'Существующие праздники' : 'Existing Holidays'}</CardTitle><CardDescription>{holidays.length} {locale === 'ru' ? 'всего' : 'total'}</CardDescription></CardHeader>
          <CardContent>
            {holidays.length ? (
              <div className="divide-y">
                {holidays.map((h) => (
                  <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={h.id}>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{h.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(h.date, locale)}</span>
                        <Badge variant={h.isPaid ? 'success' : 'secondary'} className="text-[10px]">{h.isPaid ? t('payroll.holidayPaid') : t('payroll.unpaidHoliday')}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void deleteHoliday(h.id)} type="button"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="py-6 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderExportsTab() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('payroll.exportTitle')}</CardTitle><CardDescription>{t('payroll.exportSubtitle')}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{locale === 'ru' ? 'Мгновенный' : 'Instant'}</p>
              <div className="grid grid-cols-3 gap-2">
                <Button disabled={isExporting} onClick={() => void handleExport('xlsx')} type="button"><Download className="mr-1 h-4 w-4" /> XLSX</Button>
                <Button disabled={isExporting} onClick={() => void handleExport('csv')} type="button" variant="outline"><Download className="mr-1 h-4 w-4" /> CSV</Button>
                <Button disabled={isExporting} onClick={() => void handleExport('pdf')} type="button" variant="outline"><Download className="mr-1 h-4 w-4" /> PDF</Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{locale === 'ru' ? 'Фоновый' : 'Background'}</p>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => void handleAsyncExport('xlsx')} type="button" variant="secondary">XLSX</Button>
                <Button onClick={() => void handleAsyncExport('csv')} type="button" variant="secondary">CSV</Button>
                <Button onClick={() => void handleAsyncExport('pdf')} type="button" variant="secondary">PDF</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t('exports.recentJobs')}</CardTitle></CardHeader>
          <CardContent>
            {exportJobs.length ? (
              <div className="divide-y">
                {exportJobs.map((job) => (
                  <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" key={job.id}>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">{job.fileName ?? `${job.type} / ${job.format.toUpperCase()}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(job.createdAt, locale)}</p>
                      {job.downloadUrl && <a className="text-xs font-medium text-primary hover:underline" href={job.downloadUrl} rel="noreferrer" target="_blank">{t('exports.downloadResult')}</a>}
                      {job.errorMessage && <p className="text-xs text-destructive">{job.errorMessage}</p>}
                    </div>
                    <Badge variant={getJobStatusVariant(job.status)} className="shrink-0">{job.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="py-6 text-center text-sm text-muted-foreground">{t('exports.noJobs')}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Main render ── */

  return (
    <AdminShell>
      <main className="flex w-full flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('nav.payroll')}</span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">{t('payroll.title')}</h1>
            {summary && <span className="text-sm text-muted-foreground">{formatDate(summary.range.dateFrom, locale)} – {formatDate(summary.range.dateTo, locale)}</span>}
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">{t('payroll.subtitle')}</p>
        </header>

        {notice && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${notice.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300'}`}>
            {notice.tone === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {notice.text}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground animate-pulse">{locale === 'ru' ? 'Загружаем...' : 'Loading...'}</div>
        ) : summary ? (
          <>
            {/* KPI stripe */}
            <div className="grid grid-cols-2 rounded-xl border bg-card sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: t('payroll.employees'), value: String(summary.totals.employees), icon: Users },
                { label: t('payroll.scheduled'), value: formatHours(summary.totals.scheduledMinutes), icon: CalendarRange },
                { label: t('payroll.worked'), value: formatHours(summary.totals.workedMinutes), icon: Clock3 },
                { label: t('payroll.night'), value: formatHours(summary.totals.nightMinutes), icon: MoonStar },
                { label: t('payroll.holiday'), value: formatHours(summary.totals.holidayMinutes), icon: CalendarRange },
                { label: t('payroll.overtime'), value: formatHours(summary.totals.overtimeMinutes), icon: FileClock },
                { label: t('payroll.gross'), value: formatMoney(summary.totals.estimatedGrossPay), icon: Wallet, accent: true },
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className={`flex flex-col gap-1 border-b px-5 py-4 sm:border-b-0 ${i !== 0 ? 'sm:border-l' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</span>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <span className={`text-xl font-bold ${m.accent ? 'text-primary' : ''}`}>{m.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="w-full space-y-6">
              <div className="flex w-full flex-wrap items-center gap-4">
                <div className="flex overflow-hidden rounded-xl border border-border">
                  {payrollTabs.map((tab) => (
                    <button
                      key={tab.value}
                      className={`px-4 py-2 text-sm font-heading font-medium transition-colors ${
                        activeTab === tab.value
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'summary' && renderSummaryTab()}
              {activeTab === 'policy' && renderPolicyTab()}
              {activeTab === 'holidays' && renderHolidaysTab()}
              {activeTab === 'exports' && renderExportsTab()}
            </div>
          </>
        ) : (
          <div className="py-24 text-center text-sm text-muted-foreground">{t('common.noData')}</div>
        )}
      </main>
    </AdminShell>
  );
}
