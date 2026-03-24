'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Monitor,
  ScanFace,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import {
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  EmployeeBiometricHistoryResponse,
} from '@smart/types';
import { AdminShell } from '../../../components/admin-shell';
import { apiRequest } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';

type EmployeeDetails = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  hireDate: string;
  user: { email: string };
  department: { name: string };
  company: { name: string };
  primaryLocation: { name: string };
  position: { name: string };
  devices: Array<{
    id: string;
    platform: string;
    deviceName: string | null;
    isPrimary: boolean;
  }>;
};

type Tab = 'info' | 'attendance' | 'biometric' | 'anomalies';

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDevicePlatform(platform: string, locale: string) {
  switch (platform) {
    case 'IOS':
      return locale === 'ru' ? 'iPhone / iPad' : 'iPhone / iPad';
    case 'ANDROID':
      return 'Android';
    case 'WEB':
      return locale === 'ru' ? 'Веб / десктоп' : 'Web / desktop';
    default:
      return platform;
  }
}

export default function EmployeeCardPage() {
  const { locale } = useI18n();
  const params = useParams<{ employeeId: string }>();
  const employeeId = Array.isArray(params.employeeId) ? params.employeeId[0] : params.employeeId;
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(null);
  const [biometricHistory, setBiometricHistory] = useState<EmployeeBiometricHistoryResponse | null>(null);
  const [tab, setTab] = useState<Tab>('attendance');
  const [deviceActionId, setDeviceActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function loadEmployeePageData(targetEmployeeId: string) {
    const session = getSession();
    if (!session || !targetEmployeeId) return;

    const [employeeData, historyData, anomaliesData, biometricData] = await Promise.all([
      apiRequest<EmployeeDetails>(`/employees/${targetEmployeeId}`, { token: session.accessToken }),
      apiRequest<AttendanceHistoryResponse>(`/attendance/employees/${targetEmployeeId}/history`, { token: session.accessToken }),
      apiRequest<AttendanceAnomalyResponse>(`/attendance/team/anomalies?employeeId=${targetEmployeeId}`, {
        token: session.accessToken,
      }),
      apiRequest<EmployeeBiometricHistoryResponse>(`/biometric/employees/${targetEmployeeId}/history`, { token: session.accessToken }),
    ]);

    setEmployee(employeeData);
    setHistory(historyData);
    setAnomalies(anomaliesData);
    setBiometricHistory(biometricData);
  }

  useEffect(() => {
    if (!employeeId) return;

    void loadEmployeePageData(employeeId).catch(() => {
      setEmployee(null);
      setHistory(null);
      setAnomalies(null);
      setBiometricHistory(null);
      setNotice({
        kind: 'error',
        text: locale === 'ru' ? 'Не удалось загрузить карточку сотрудника.' : 'Failed to load employee card.',
      });
    });
  }, [employeeId]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const tabs: { key: Tab; label: string; icon: typeof User; count?: number }[] = useMemo(
    () => [
      {
        key: 'attendance',
        label: locale === 'ru' ? 'Check-in / Check-out' : 'Check-in / Check-out',
        icon: Clock,
        count: history?.rows.length,
      },
      {
        key: 'biometric',
        label: locale === 'ru' ? 'Биометрия' : 'Biometric',
        icon: ScanFace,
        count: biometricHistory?.verifications.length,
      },
      {
        key: 'anomalies',
        label: locale === 'ru' ? 'Аномалии' : 'Anomalies',
        icon: ShieldAlert,
        count: anomalies?.items.length,
      },
      {
        key: 'info',
        label: locale === 'ru' ? 'Информация' : 'Info',
        icon: User,
      },
    ],
    [locale, history, biometricHistory, anomalies],
  );

  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : '...';
  const primaryBiometricUrl = useMemo(() => {
    if (biometricHistory?.profile?.templateUrl) {
      return biometricHistory.profile.templateUrl;
    }

    for (const verification of biometricHistory?.verifications ?? []) {
      const previewArtifact = verification.artifacts.find((artifact) => artifact.url);
      if (previewArtifact?.url) {
        return previewArtifact.url;
      }
    }

    return null;
  }, [biometricHistory]);

  async function handleDetachDevice(deviceId: string, deviceLabel: string) {
    const session = getSession();
    if (!session || !employeeId) return;

    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        locale === 'ru'
          ? `Отвязать устройство "${deviceLabel}" от сотрудника?`
          : `Detach "${deviceLabel}" from this employee?`,
      );

    if (!confirmed) {
      return;
    }

    setDeviceActionId(deviceId);

    try {
      await apiRequest(`/devices/employees/${employeeId}/${deviceId}`, {
        method: 'DELETE',
        token: session.accessToken,
      });
      await loadEmployeePageData(employeeId);
      setNotice({
        kind: 'success',
        text: locale === 'ru' ? 'Устройство отвязано.' : 'Device detached.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : locale === 'ru' ? 'Не удалось отвязать устройство.' : 'Failed to detach device.',
      });
    } finally {
      setDeviceActionId(null);
    }
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/employees"
          >
            <ArrowLeft className="size-4" />
            {locale === 'ru' ? 'Сотрудники' : 'Employees'}
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent">
              {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '..'}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">{fullName}</h1>
              {employee && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="size-3.5" />{employee.position.name}</span>
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" />{employee.primaryLocation.name}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3.5" />{employee.department.name}</span>
                  <span className="font-mono text-xs opacity-60">#{employee.employeeNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
                key={t.key}
                onClick={() => setTab(t.key)}
                type="button"
              >
                <Icon className="size-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    tab === t.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              notice.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-3">
          {/* ─── Attendance ─── */}
          {tab === 'attendance' && (
            <>
              {history && history.rows.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">{locale === 'ru' ? 'Дата' : 'Date'}</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Отработано' : 'Worked'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Перерывы' : 'Breaks'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Опоздание' : 'Late'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Ранний уход' : 'Early leave'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Статус' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.rows.map((row) => (
                        <tr className="transition-colors hover:bg-muted/20" key={row.sessionId}>
                          <td className="px-4 py-3 font-medium">{formatDate(row.startedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-green-600">{formatTime(row.checkInEvent.occurredAt)}</span>
                              {row.checkInEvent.distanceMeters !== null && (
                                <span className="text-[10px] text-muted-foreground">{row.checkInEvent.distanceMeters}m</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.checkOutEvent ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-red-500">{formatTime(row.checkOutEvent.occurredAt)}</span>
                                {row.checkOutEvent.distanceMeters !== null && (
                                  <span className="text-[10px] text-muted-foreground">{row.checkOutEvent.distanceMeters}m</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-500">{locale === 'ru' ? 'На смене' : 'On shift'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{formatHours(row.workedMinutes)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatHours(row.breakMinutes)}</td>
                          <td className="px-4 py-3">
                            {row.lateMinutes > 0 ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{row.lateMinutes}м</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.earlyLeaveMinutes > 0 ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">{row.earlyLeaveMinutes}м</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === 'on_shift' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                                {locale === 'ru' ? 'На смене' : 'On shift'}
                              </span>
                            ) : row.status === 'on_break' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {locale === 'ru' ? 'Перерыв' : 'Break'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="size-3.5 text-green-500" />
                                {locale === 'ru' ? 'Завершено' : 'Done'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                  <Clock className="mb-2 size-8 opacity-40" />
                  <p className="font-medium">{locale === 'ru' ? 'Нет записей посещаемости' : 'No attendance records'}</p>
                </div>
              )}
            </>
          )}

          {/* ─── Biometric ─── */}
          {tab === 'biometric' && (
            <>
              {biometricHistory?.profile && (
                <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ScanFace className="size-4 text-accent" />
                      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {locale === 'ru' ? 'Основная биометрия' : 'Primary biometric'}
                      </h3>
                    </div>
                    {primaryBiometricUrl ? (
                      <img
                        alt={locale === 'ru' ? 'Основное лицо сотрудника' : 'Primary employee face'}
                        className="h-72 w-full rounded-2xl object-cover"
                        src={primaryBiometricUrl}
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                        {locale === 'ru' ? 'Основное лицо ещё не загружено в хранилище.' : 'Primary face is not available in storage yet.'}
                      </div>
                    )}
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2">
                        <span className="text-muted-foreground">{locale === 'ru' ? 'Статус' : 'Status'}</span>
                        <span className="font-medium text-foreground">{biometricHistory.profile.enrollmentStatus}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2">
                        <span className="text-muted-foreground">{locale === 'ru' ? 'Провайдер' : 'Provider'}</span>
                        <span className="font-medium text-foreground">{biometricHistory.profile.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{locale === 'ru' ? 'Статус' : 'Status'}</p>
                      <p className="mt-1 font-heading text-lg font-bold">{biometricHistory.profile.enrollmentStatus}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{locale === 'ru' ? 'Провайдер' : 'Provider'}</p>
                      <p className="mt-1 font-heading text-lg font-bold">{biometricHistory.profile.provider}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{locale === 'ru' ? 'Зарегистрирован' : 'Enrolled at'}</p>
                      <p className="mt-1 font-heading text-lg font-bold">{biometricHistory.profile.enrolledAt ? formatDate(biometricHistory.profile.enrolledAt) : '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{locale === 'ru' ? 'Последняя проверка' : 'Last verified'}</p>
                      <p className="mt-1 font-heading text-lg font-bold">{biometricHistory.profile.lastVerifiedAt ? formatDate(biometricHistory.profile.lastVerifiedAt) : '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {biometricHistory && biometricHistory.verifications.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
                    <div>
                      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                        {locale === 'ru' ? 'История верификаций' : 'Verification history'}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {locale === 'ru'
                          ? 'Все проверки лица сотрудника и связанные события посещаемости.'
                          : 'All face verification attempts and linked attendance events.'}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      {biometricHistory.verifications.length}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">{locale === 'ru' ? 'Дата' : 'Date'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Результат' : 'Result'}</th>
                        <th className="px-4 py-3">Liveness</th>
                        <th className="px-4 py-3">Match</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Событие' : 'Event'}</th>
                        <th className="px-4 py-3">{locale === 'ru' ? 'Ручной ревью' : 'Manual review'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {biometricHistory.verifications.map((v) => (
                        <tr className="transition-colors hover:bg-muted/20" key={v.id}>
                          <td className="px-4 py-3 font-medium">
                            {formatDate(v.capturedAt)}
                            <br />
                            <span className="text-xs text-muted-foreground">{formatTime(v.capturedAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              v.result === 'PASSED' ? 'bg-green-50 text-green-700' :
                              v.result === 'REVIEW' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {v.result === 'PASSED' ? <CheckCircle2 className="size-3" /> : v.result === 'FAILED' ? <XCircle className="size-3" /> : <ShieldAlert className="size-3" />}
                              {v.result}
                            </span>
                          </td>
                          <td className="px-4 py-3">{v.livenessScore !== null ? `${Math.round(v.livenessScore * 100)}%` : '—'}</td>
                          <td className="px-4 py-3">{v.matchScore !== null ? `${Math.round(v.matchScore * 100)}%` : '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {v.attendanceEvent ? `${v.attendanceEvent.eventType} ${formatDateTime(v.attendanceEvent.occurredAt)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">{v.manualReviewStatus ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                  <ScanFace className="mb-2 size-8 opacity-40" />
                  <p className="font-medium">{locale === 'ru' ? 'Нет записей верификации' : 'No verification records'}</p>
                </div>
              )}
            </>
          )}

          {/* ─── Anomalies ─── */}
          {tab === 'anomalies' && (
            <>
              {anomalies && anomalies.items.length > 0 ? (
                <div className="space-y-2">
                  {anomalies.items.map((item) => (
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4" key={item.anomalyId}>
                      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="font-medium text-foreground">{item.summary}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                  <CheckCircle2 className="mb-2 size-8 text-green-500 opacity-60" />
                  <p className="font-medium">{locale === 'ru' ? 'Аномалий не обнаружено' : 'No anomalies found'}</p>
                </div>
              )}
            </>
          )}

          {/* ─── Info ─── */}
          {tab === 'info' && employee && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <User className="size-4" />{locale === 'ru' ? 'Личные данные' : 'Personal'}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Имя' : 'Name'}</dt><dd className="font-medium">{employee.firstName} {employee.lastName}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{employee.user.email}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Номер' : 'Number'}</dt><dd className="font-medium">#{employee.employeeNumber}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Дата найма' : 'Hire date'}</dt><dd className="font-medium">{formatDate(employee.hireDate)}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Briefcase className="size-4" />{locale === 'ru' ? 'Организация' : 'Organization'}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Компания' : 'Company'}</dt><dd className="font-medium">{employee.company.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Отдел' : 'Department'}</dt><dd className="font-medium">{employee.department.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Должность' : 'Position'}</dt><dd className="font-medium">{employee.position.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{locale === 'ru' ? 'Локация' : 'Location'}</dt><dd className="font-medium">{employee.primaryLocation.name}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Monitor className="size-4" />{locale === 'ru' ? 'Устройства' : 'Devices'}
                </h3>
                {employee.devices.length > 0 ? (
                  <div className="space-y-2">
                    {employee.devices.map((device) => (
                      <div className="flex flex-col gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={device.id}>
                        <div>
                          <p className="font-medium text-foreground">{device.deviceName ?? formatDevicePlatform(device.platform, locale)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatDevicePlatform(device.platform, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {device.isPrimary && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                              {locale === 'ru' ? 'Основное' : 'Primary'}
                            </span>
                          )}
                          <button
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={deviceActionId === device.id}
                            onClick={() =>
                              void handleDetachDevice(
                                device.id,
                                device.deviceName ?? formatDevicePlatform(device.platform, locale),
                              )
                            }
                            type="button"
                          >
                            {deviceActionId === device.id
                              ? locale === 'ru'
                                ? 'Отвязываем...'
                                : 'Detaching...'
                              : locale === 'ru'
                                ? 'Отвязать устройство'
                                : 'Detach device'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{locale === 'ru' ? 'Устройства не зарегистрированы' : 'No devices registered'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminShell>
  );
}
