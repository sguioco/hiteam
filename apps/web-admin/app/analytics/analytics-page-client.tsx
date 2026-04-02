'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceAnomalyResponse, AttendanceHistoryResponse } from '@smart/types';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  LoaderCircle,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminShell } from '../../components/admin-shell';
import { apiRequest } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

type Period = '7d' | '14d' | '30d';

type DailyAttendanceBucket = {
  absent: number;
  date: string;
  earlyLeaveEmployeeIds: Set<string>;
  isWeekend: boolean;
  lateEmployeeIds: Set<string>;
  presentEmployeeIds: Set<string>;
  shortDate: string;
};

function formatDayLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function createDailyBuckets(days: number, locale: string) {
  const { start, end } = buildDateRange(days);
  const buckets = new Map<string, DailyAttendanceBucket>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = getDateKey(date);
    const dayOfWeek = date.getDay();
    buckets.set(key, {
      absent: 0,
      date: formatDayLabel(date, locale),
      earlyLeaveEmployeeIds: new Set<string>(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      lateEmployeeIds: new Set<string>(),
      presentEmployeeIds: new Set<string>(),
      shortDate: date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric' }),
    });
  }

  return { buckets, start, end };
}

function formatWindowLabel(days: number, locale: string) {
  return locale === 'ru' ? `за ${days} дн.` : `in ${days} days`;
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export type AnalyticsPageInitialData = {
  anomalies: AttendanceAnomalyResponse | null;
  employeeCount: number;
  history: AttendanceHistoryResponse | null;
  period: Period;
};

export default function AnalyticsPageClient({
  initialData,
}: {
  initialData?: AnalyticsPageInitialData | null;
}) {
  const { locale } = useI18n();
  const [period, setPeriod] = useState<Period>(initialData?.period ?? '14d');
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(
    initialData?.history ?? null,
  );
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    initialData?.anomalies ?? null,
  );
  const [employeeCount, setEmployeeCount] = useState(initialData?.employeeCount ?? 0);
  const didUseInitialData = useRef(Boolean(initialData));

  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;

  useEffect(() => {
    if (
      didUseInitialData.current &&
      initialData &&
      period === initialData.period
    ) {
      didUseInitialData.current = false;
      setLoading(false);
      return;
    }

    const session = getSession();
    if (!session) {
      setHistory(null);
      setAnomalies(null);
      setEmployeeCount(0);
      setError(locale === 'ru' ? 'Сессия не найдена. Войдите заново.' : 'Session not found. Please sign in again.');
      setLoading(false);
      return;
    }

    const { start, end } = buildDateRange(days);
    const query = new URLSearchParams({
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
    });

    setLoading(true);
    setError(null);

    void Promise.all([
      apiRequest<AttendanceHistoryResponse>(`/attendance/team/history?${query.toString()}`, {
        token: session.accessToken,
      }),
      apiRequest<AttendanceAnomalyResponse>(`/attendance/team/anomalies?${query.toString()}`, {
        token: session.accessToken,
      }),
      apiRequest<Array<{ id: string }>>('/employees', {
        token: session.accessToken,
      }),
    ])
      .then(([historyData, anomaliesData, employees]) => {
        setHistory(historyData);
        setAnomalies(anomaliesData);
        setEmployeeCount(employees.length);
      })
      .catch((loadError) => {
        setHistory(null);
        setAnomalies(null);
        setEmployeeCount(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : locale === 'ru'
              ? 'Не удалось загрузить аналитику.'
              : 'Unable to load analytics.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [days, locale]);

  const chartData = useMemo(() => {
    const { buckets } = createDailyBuckets(days, locale);

    for (const row of history?.rows ?? []) {
      const startedAt = new Date(row.startedAt);
      if (Number.isNaN(startedAt.getTime())) continue;

      const key = getDateKey(startedAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      bucket.presentEmployeeIds.add(row.employeeId);
      if (row.lateMinutes > 0) {
        bucket.lateEmployeeIds.add(row.employeeId);
      }
      if (row.earlyLeaveMinutes > 0) {
        bucket.earlyLeaveEmployeeIds.add(row.employeeId);
      }
    }

    return Array.from(buckets.values()).map((bucket) => {
      const present = bucket.presentEmployeeIds.size;
      const late = bucket.lateEmployeeIds.size;
      const absent = bucket.isWeekend ? 0 : Math.max(employeeCount - present, 0);
      return {
        absent,
        date: bucket.date,
        earlyLeave: bucket.earlyLeaveEmployeeIds.size,
        isWeekend: bucket.isWeekend,
        late,
        present,
        shortDate: bucket.shortDate,
      };
    });
  }, [days, employeeCount, history?.rows, locale]);

  const totals = useMemo(() => {
    const workDays = chartData.filter((day) => !day.isWeekend);
    const totalPresent = workDays.reduce((sum, day) => sum + day.present, 0);
    const totalLate = workDays.reduce((sum, day) => sum + day.late, 0);
    const totalAbsent = workDays.reduce((sum, day) => sum + day.absent, 0);
    const possibleAttendance = employeeCount * workDays.length;

    return {
      attendanceRate: possibleAttendance ? (totalPresent / possibleAttendance) * 100 : 0,
      avgLate: workDays.length ? (totalLate / workDays.length).toFixed(1) : '0',
      avgPresent: workDays.length ? Math.round(totalPresent / workDays.length) : 0,
      totalAbsent,
    };
  }, [chartData, employeeCount]);

  const maxValue = Math.max(...chartData.map((day) => day.present + day.late + day.absent), 1);

  const frequentLateArrivals = useMemo(() => {
    const counters = new Map<string, { count: number; name: string }>();

    for (const row of history?.rows ?? []) {
      if (row.lateMinutes <= 0) continue;
      const current = counters.get(row.employeeId);
      counters.set(row.employeeId, {
        count: (current?.count ?? 0) + 1,
        name: row.employeeName,
      });
    }

    return Array.from(counters.values())
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 3);
  }, [history?.rows]);

  const earlyDepartures = useMemo(() => {
    const counters = new Map<string, { count: number; name: string }>();

    for (const row of history?.rows ?? []) {
      if (row.earlyLeaveMinutes <= 0) continue;
      const current = counters.get(row.employeeId);
      counters.set(row.employeeId, {
        count: (current?.count ?? 0) + 1,
        name: row.employeeName,
      });
    }

    return Array.from(counters.values())
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 3);
  }, [history?.rows]);

  const periods: { key: Period; label: string }[] = [
    { key: '7d', label: locale === 'ru' ? '7 дней' : '7 days' },
    { key: '14d', label: locale === 'ru' ? '14 дней' : '14 days' },
    { key: '30d', label: locale === 'ru' ? '30 дней' : '30 days' },
  ];

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {locale === 'ru' ? 'Аналитика' : 'Analytics'}
            </span>
            <h1 className="font-heading text-2xl font-bold">
              {locale === 'ru' ? 'Обзор посещаемости' : 'Attendance overview'}
            </h1>
          </div>
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
            {periods.map((item) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  period === item.key
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                key={item.key}
                onClick={() => setPeriod(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin" />
            {locale === 'ru' ? 'Загружаем аналитику...' : 'Loading analytics...'}
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {locale === 'ru' ? 'Средн. присутствие' : 'Avg. present'}
                  </span>
                </div>
                <p className="font-heading text-3xl font-bold">{totals.avgPresent}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="size-3" />
                  {locale === 'ru' ? 'в рабочий день' : 'per work day'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {locale === 'ru' ? 'Средн. опоздания' : 'Avg. late'}
                  </span>
                </div>
                <p className="font-heading text-3xl font-bold">{totals.avgLate}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <TrendingDown className="size-3" />
                  {locale === 'ru' ? 'в рабочий день' : 'per work day'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {locale === 'ru' ? 'Всего отсутствий' : 'Total absent'}
                  </span>
                </div>
                <p className="font-heading text-3xl font-bold">{totals.totalAbsent}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatWindowLabel(days, locale)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {locale === 'ru' ? 'Посещаемость' : 'Attendance rate'}
                  </span>
                </div>
                <p className="font-heading text-3xl font-bold">{formatPercent(totals.attendanceRate)}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: formatPercent(totals.attendanceRate) }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {locale === 'ru' ? 'Посещаемость по дням' : 'Daily attendance'}
              </h2>

              <div className="mb-4 flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-green-500" />
                  {locale === 'ru' ? 'Присутствовали' : 'Present'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-amber-400" />
                  {locale === 'ru' ? 'Опоздали' : 'Late'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-red-400" />
                  {locale === 'ru' ? 'Отсутствовали' : 'Absent'}
                </span>
              </div>

              <div className="flex items-end gap-1" style={{ height: 200 }}>
                {chartData.map((day) => {
                  const total = day.present + day.late + day.absent;
                  const pct = (value: number) => (total > 0 ? (value / maxValue) * 100 : 0);

                  return (
                    <div
                      className="group relative flex flex-1 flex-col items-center"
                      key={`${day.date}-${day.shortDate}`}
                    >
                      <div className="relative flex w-full flex-col items-stretch" style={{ height: 180 }}>
                        <div className="mt-auto flex w-full flex-col overflow-hidden rounded-t-md">
                          {day.absent > 0 && (
                            <div
                              className="w-full bg-red-400 transition-all group-hover:opacity-80"
                              style={{ height: `${pct(day.absent)}%`, minHeight: 2 }}
                            />
                          )}
                          {day.late > 0 && (
                            <div
                              className="w-full bg-amber-400 transition-all group-hover:opacity-80"
                              style={{ height: `${pct(day.late)}%`, minHeight: 2 }}
                            />
                          )}
                          {day.present > 0 && (
                            <div
                              className="w-full bg-green-500 transition-all group-hover:opacity-80"
                              style={{ height: `${pct(day.present)}%`, minHeight: 2 }}
                            />
                          )}
                        </div>
                      </div>
                      <span className={`mt-1 text-[9px] leading-none ${day.isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                        {day.shortDate}
                      </span>

                      <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg group-hover:block">
                        <div className="font-semibold">{day.date}</div>
                        <div className="text-green-300">{locale === 'ru' ? 'Прис' : 'Pres'}: {day.present}</div>
                        <div className="text-amber-300">{locale === 'ru' ? 'Опозд' : 'Late'}: {day.late}</div>
                        <div className="text-red-300">{locale === 'ru' ? 'Отс' : 'Abs'}: {day.absent}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {locale === 'ru' ? 'Частые опоздания' : 'Frequent late arrivals'}
                </h3>
                <div className="space-y-2">
                  {frequentLateArrivals.length ? (
                    frequentLateArrivals.map((item) => (
                      <div className="flex items-center justify-between text-sm" key={item.name}>
                        <span className="font-medium">{item.name}</span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                          {item.count}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ru' ? 'За выбранный период опозданий нет.' : 'No late arrivals in the selected period.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {locale === 'ru' ? 'Ранние уходы' : 'Early departures'}
                </h3>
                <div className="space-y-2">
                  {earlyDepartures.length ? (
                    earlyDepartures.map((item) => (
                      <div className="flex items-center justify-between text-sm" key={item.name}>
                        <span className="font-medium">{item.name}</span>
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                          {item.count}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ru' ? 'За выбранный период ранних уходов нет.' : 'No early departures in the selected period.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {locale === 'ru' ? 'Аномалии посещаемости' : 'Attendance anomalies'}
              </h3>
              {anomalies?.items.length ? (
                <div className="space-y-2">
                  {anomalies.items.slice(0, 5).map((item) => (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm" key={item.anomalyId}>
                      <div>
                        <p className="font-medium">{item.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{item.summary}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {item.severity === 'critical'
                          ? locale === 'ru' ? 'Критично' : 'Critical'
                          : locale === 'ru' ? 'Предупреждение' : 'Warning'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === 'ru' ? 'За выбранный период аномалий не найдено.' : 'No anomalies found in the selected period.'}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </AdminShell>
  );
}
