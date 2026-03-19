'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminShell } from '../../components/admin-shell';
import { useI18n } from '../../lib/i18n';

type Period = '7d' | '14d' | '30d';

function mockBar(max: number) {
  return Math.floor(Math.random() * max);
}

function generateWeekData(days: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    data.push({
      date: d.toLocaleDateString([], { day: 'numeric', month: 'short' }),
      shortDate: d.toLocaleDateString([], { day: 'numeric' }),
      present: isWeekend ? mockBar(3) : 8 + mockBar(4),
      late: isWeekend ? 0 : mockBar(3),
      absent: isWeekend ? mockBar(8) : mockBar(2),
      isWeekend,
    });
  }
  return data;
}

export default function AnalyticsPage() {
  const { locale } = useI18n();
  const [period, setPeriod] = useState<Period>('14d');

  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const data = useMemo(() => generateWeekData(days), [days]);

  const totals = useMemo(() => {
    const totalPresent = data.reduce((s, d) => s + d.present, 0);
    const totalLate = data.reduce((s, d) => s + d.late, 0);
    const totalAbsent = data.reduce((s, d) => s + d.absent, 0);
    const workDays = data.filter((d) => !d.isWeekend).length;
    return {
      avgPresent: workDays ? Math.round(totalPresent / workDays) : 0,
      avgLate: workDays ? (totalLate / workDays).toFixed(1) : '0',
      totalAbsent,
      attendanceRate: workDays
        ? Math.round((totalPresent / (totalPresent + totalAbsent + totalLate)) * 100)
        : 0,
    };
  }, [data]);

  const maxValue = Math.max(...data.map((d) => d.present + d.late + d.absent), 1);

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
            {periods.map((p) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  period === p.key
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                key={p.key}
                onClick={() => setPeriod(p.key)}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
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
              <TrendingUp className="size-3" />{locale === 'ru' ? 'в день' : 'per day'}
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
              <TrendingDown className="size-3" />{locale === 'ru' ? 'в день' : 'per day'}
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
            <p className="mt-1 text-xs text-muted-foreground">{locale === 'ru' ? `за ${days} дн.` : `in ${days} days`}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {locale === 'ru' ? 'Посещаемость' : 'Attendance rate'}
              </span>
            </div>
            <p className="font-heading text-3xl font-bold">{totals.attendanceRate}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${totals.attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {locale === 'ru' ? 'Посещаемость по дням' : 'Daily attendance'}
          </h2>

          {/* Legend */}
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

          {/* Bars */}
          <div className="flex items-end gap-1" style={{ height: 200 }}>
            {data.map((d) => {
              const total = d.present + d.late + d.absent;
              const pct = (v: number) => (total > 0 ? (v / maxValue) * 100 : 0);
              return (
                <div
                  className="group relative flex flex-1 flex-col items-center"
                  key={d.date}
                >
                  <div className="relative flex w-full flex-col items-stretch" style={{ height: 180 }}>
                    <div className="mt-auto flex w-full flex-col overflow-hidden rounded-t-md">
                      {d.absent > 0 && (
                        <div
                          className="w-full bg-red-400 transition-all group-hover:opacity-80"
                          style={{ height: `${pct(d.absent)}%`, minHeight: d.absent > 0 ? 2 : 0 }}
                        />
                      )}
                      {d.late > 0 && (
                        <div
                          className="w-full bg-amber-400 transition-all group-hover:opacity-80"
                          style={{ height: `${pct(d.late)}%`, minHeight: d.late > 0 ? 2 : 0 }}
                        />
                      )}
                      {d.present > 0 && (
                        <div
                          className="w-full bg-green-500 transition-all group-hover:opacity-80"
                          style={{ height: `${pct(d.present)}%`, minHeight: d.present > 0 ? 2 : 0 }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={`mt-1 text-[9px] leading-none ${d.isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                    {d.shortDate}
                  </span>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg group-hover:block">
                    <div className="font-semibold">{d.date}</div>
                    <div className="text-green-300">{locale === 'ru' ? 'Прис' : 'Pres'}: {d.present}</div>
                    <div className="text-amber-300">{locale === 'ru' ? 'Опозд' : 'Late'}: {d.late}</div>
                    <div className="text-red-300">{locale === 'ru' ? 'Отс' : 'Abs'}: {d.absent}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomaly breakdown */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {locale === 'ru' ? 'Частые опоздания' : 'Frequent late arrivals'}
            </h3>
            <div className="space-y-2">
              {['Ivanov S.', 'Petrova A.', 'Sidorov M.'].map((name, i) => (
                <div className="flex items-center justify-between text-sm" key={name}>
                  <span className="font-medium">{name}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                    {3 - i}x
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {locale === 'ru' ? 'Ранние уходы' : 'Early departures'}
            </h3>
            <div className="space-y-2">
              {['Kozlov D.', 'Novikova E.'].map((name, i) => (
                <div className="flex items-center justify-between text-sm" key={name}>
                  <span className="font-medium">{name}</span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {2 - i}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
