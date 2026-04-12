"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import {
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  EmployeeBiometricHistoryResponse,
} from "@smart/types";
import { AdminShell } from "../../../components/admin-shell";
import { Table } from "../../../components/application/table/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { apiRequest } from "../../../lib/api";
import { getSession, hasDesktopAdminAccess } from "../../../lib/auth";
import { useI18n } from "../../../lib/i18n";
import {
  getRuntimeLocale,
  getRuntimeLocaleTag,
} from "../../../lib/runtime-locale";

type EmployeeDetails = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  hireDate: string;
  avatarUrl?: string | null;
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

type Tab = "info" | "attendance" | "biometric" | "anomalies";

type EmployeeManagerAccess = {
  employeeId: string;
  roleCodes: string[];
  hasAdminRole: boolean;
  hasManagerAccess: boolean;
  canToggleManagerAccess: boolean;
};

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (getRuntimeLocale() === "ru") {
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  }
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(getRuntimeLocaleTag(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(getRuntimeLocaleTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(getRuntimeLocaleTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDevicePlatform(platform: string, locale: string) {
  switch (platform) {
    case "IOS":
      return locale === "ru" ? "iPhone / iPad" : "iPhone / iPad";
    case "ANDROID":
      return "Android";
    case "WEB":
      return locale === "ru" ? "Веб / десктоп" : "Web / desktop";
    default:
      return platform;
  }
}

function getEnrollmentStatusLabel(
  status: string | null | undefined,
  locale: string,
) {
  switch (status) {
    case "ENROLLED":
      return locale === "ru" ? "Зарегистрирован" : "Registered";
    case "PENDING":
      return locale === "ru"
        ? "Регистрация не завершена"
        : "Registration pending";
    case "FAILED":
      return locale === "ru" ? "Ошибка регистрации" : "Registration failed";
    case "NOT_STARTED":
    default:
      return locale === "ru" ? "Не зарегистрирован" : "Not registered";
  }
}

function getEnrollmentStatusClassName(status: string | null | undefined) {
  switch (status) {
    case "ENROLLED":
      return "text-green-600";
    case "PENDING":
      return "text-amber-600";
    case "FAILED":
      return "text-red-600";
    case "NOT_STARTED":
    default:
      return "text-muted-foreground";
  }
}

async function settleRequest<T>(request: Promise<T>) {
  try {
    return { ok: true as const, data: await request };
  } catch {
    return { ok: false as const };
  }
}

function getEmployeeInitials(employee: EmployeeDetails | null) {
  const firstInitial = employee?.firstName?.trim().charAt(0) ?? "";
  const lastInitial = employee?.lastName?.trim().charAt(0) ?? "";
  return (firstInitial + lastInitial).toUpperCase() || "—";
}

function SectionState({
  icon: Icon,
  message,
  tone = "muted",
}: {
  icon: typeof User;
  message: string;
  tone?: "muted" | "error";
}) {
  const iconClassName =
    tone === "error"
      ? "mb-2 size-8 text-red-500 opacity-60"
      : "mb-2 size-8 opacity-40";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <Icon className={iconClassName} />
      <p className="font-medium">{message}</p>
    </div>
  );
}

export type EmployeeDetailPageInitialData = {
  anomalies: AttendanceAnomalyResponse | null;
  biometricHistory: EmployeeBiometricHistoryResponse | null;
  employee: EmployeeDetails | null;
  employeeId: string;
  history: AttendanceHistoryResponse | null;
  managerAccess: EmployeeManagerAccess | null;
};

export default function EmployeeCardPageClient({
  initialData,
}: {
  initialData?: EmployeeDetailPageInitialData | null;
}) {
  const { locale } = useI18n();
  const employeeId = initialData?.employeeId ?? "";
  const [employee, setEmployee] = useState<EmployeeDetails | null>(
    initialData?.employee ?? null,
  );
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(
    initialData?.history ?? null,
  );
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    initialData?.anomalies ?? null,
  );
  const [biometricHistory, setBiometricHistory] =
    useState<EmployeeBiometricHistoryResponse | null>(
      initialData?.biometricHistory ?? null,
    );
  const [managerAccess, setManagerAccess] =
    useState<EmployeeManagerAccess | null>(initialData?.managerAccess ?? null);
  const [tab, setTab] = useState<Tab>("attendance");
  const [deviceActionId, setDeviceActionId] = useState<string | null>(null);
  const [roleActionPending, setRoleActionPending] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<
    string | null
  >(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] =
    useState<string | null>(null);
  const session = getSession();
  const canManageRoles = hasDesktopAdminAccess(session?.user.roleCodes ?? []);
  const initialDataIsComplete = Boolean(
    initialData?.employee &&
      initialData?.history &&
      initialData?.anomalies &&
      initialData?.biometricHistory &&
      (!canManageRoles || initialData?.managerAccess),
  );
  const didUseInitialData = useRef(Boolean(initialData) && initialDataIsComplete);

  async function loadEmployeePageData(targetEmployeeId: string) {
    const session = getSession();
    if (!session || !targetEmployeeId) return;

    const [
      employeeData,
      historyData,
      anomaliesData,
      biometricData,
      managerAccessData,
    ] = await Promise.all([
      settleRequest(
        apiRequest<EmployeeDetails>(`/employees/${targetEmployeeId}`, {
          token: session.accessToken,
        }),
      ),
      settleRequest(
        apiRequest<AttendanceHistoryResponse>(
          `/attendance/employees/${targetEmployeeId}/history`,
          { token: session.accessToken },
        ),
      ),
      settleRequest(
        apiRequest<AttendanceAnomalyResponse>(
          `/attendance/team/anomalies?employeeId=${targetEmployeeId}`,
          {
            token: session.accessToken,
          },
        ),
      ),
      settleRequest(
        apiRequest<EmployeeBiometricHistoryResponse>(
          `/biometric/employees/${targetEmployeeId}/history`,
          { token: session.accessToken },
        ),
      ),
      canManageRoles
        ? settleRequest(
            apiRequest<EmployeeManagerAccess>(
              `/employees/${targetEmployeeId}/manager-access`,
              {
                token: session.accessToken,
              },
            ),
          )
        : Promise.resolve({ ok: true as const, data: null }),
    ]);

    const hasPartialFailure =
      !employeeData.ok ||
      !historyData.ok ||
      !anomaliesData.ok ||
      !biometricData.ok ||
      !managerAccessData.ok;

    if (employeeData.ok) {
      setEmployee(employeeData.data);
    }
    if (historyData.ok) {
      setHistory(historyData.data);
    }
    if (anomaliesData.ok) {
      setAnomalies(anomaliesData.data);
    }
    if (biometricData.ok) {
      setBiometricHistory(biometricData.data);
    }
    if (managerAccessData.ok) {
      setManagerAccess(managerAccessData.data);
    }

    if (hasPartialFailure) {
      setNotice({
        kind: "error",
        text:
          locale === "ru"
            ? "Часть данных сотрудника не загрузилась. Основная информация сохранена."
            : "Some employee data failed to load. Core information is still shown.",
      });
    }
  }

  useEffect(() => {
    if (!employeeId) return;

    if (didUseInitialData.current) {
      didUseInitialData.current = false;
      return;
    }

    void loadEmployeePageData(employeeId);
  }, [employeeId, canManageRoles]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const tabs: { key: Tab; label: string; icon: typeof User; count?: number }[] =
    useMemo(
      () => [
        {
          key: "attendance",
          label:
            locale === "ru" ? "Check-in / Check-out" : "Check-in / Check-out",
          icon: Clock,
          count: history?.rows.length,
        },
        {
          key: "biometric",
          label: locale === "ru" ? "Биометрия" : "Biometric",
          icon: ScanFace,
          count: biometricHistory?.verifications.length,
        },
        {
          key: "anomalies",
          label: locale === "ru" ? "Аномалии" : "Anomalies",
          icon: ShieldAlert,
          count: anomalies?.items.length,
        },
        {
          key: "info",
          label: locale === "ru" ? "Информация" : "Info",
          icon: User,
        },
      ],
      [locale, history, biometricHistory, anomalies],
    );

  const fullName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : "...";
  const employeeInitials = useMemo(
    () => getEmployeeInitials(employee),
    [employee],
  );
  const selectedVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) => item.id === selectedVerificationId,
      ) ?? null,
    [biometricHistory, selectedVerificationId],
  );
  const selectedVerificationArtifacts =
    selectedVerification?.artifacts.filter((artifact) => artifact.url) ?? [];
  const selectedAttendanceSession = useMemo(
    () =>
      history?.rows.find((item) => item.sessionId === selectedAttendanceSessionId) ??
      null,
    [history, selectedAttendanceSessionId],
  );
  const selectedCheckInVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) =>
          item.attendanceEvent?.id === selectedAttendanceSession?.checkInEvent.eventId,
      ) ?? null,
    [biometricHistory, selectedAttendanceSession],
  );
  const selectedCheckOutVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) =>
          item.attendanceEvent?.id === selectedAttendanceSession?.checkOutEvent?.eventId,
      ) ?? null,
    [biometricHistory, selectedAttendanceSession],
  );
  const biometricStatusLabel = getEnrollmentStatusLabel(
    biometricHistory?.profile?.enrollmentStatus,
    locale,
  );
  const biometricStatusClassName = getEnrollmentStatusClassName(
    biometricHistory?.profile?.enrollmentStatus,
  );
  const biometricEnrolledAt = biometricHistory?.profile?.enrolledAt ?? null;
  const biometricLastVerifiedAt =
    biometricHistory?.profile?.lastVerifiedAt ?? null;
  const primaryBiometricUrl = useMemo(() => {
    if (biometricHistory?.profile?.templateUrl) {
      return biometricHistory.profile.templateUrl;
    }

    for (const verification of biometricHistory?.verifications ?? []) {
      const previewArtifact = verification.artifacts.find(
        (artifact) => artifact.url,
      );
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
      typeof window === "undefined" ||
      window.confirm(
        locale === "ru"
          ? `Отвязать устройство "${deviceLabel}" от сотрудника?`
          : `Detach "${deviceLabel}" from this employee?`,
      );

    if (!confirmed) {
      return;
    }

    setDeviceActionId(deviceId);

    try {
      await apiRequest(`/devices/employees/${employeeId}/${deviceId}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      await loadEmployeePageData(employeeId);
      setNotice({
        kind: "success",
        text: locale === "ru" ? "Устройство отвязано." : "Device detached.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось отвязать устройство."
              : "Failed to detach device.",
      });
    } finally {
      setDeviceActionId(null);
    }
  }

  async function handleToggleManagerAccess() {
    const session = getSession();
    if (
      !session ||
      !employeeId ||
      !managerAccess ||
      !managerAccess.canToggleManagerAccess
    ) {
      return;
    }

    const nextValue = !managerAccess.hasManagerAccess;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        nextValue
          ? locale === "ru"
            ? "Выдать сотруднику доступ менеджера?"
            : "Grant manager access to this employee?"
          : locale === "ru"
            ? "Снять с сотрудника доступ менеджера и вернуть роль обычного работника?"
            : "Remove manager access and turn this user back into a regular employee?",
      );

    if (!confirmed) {
      return;
    }

    setRoleActionPending(true);

    try {
      const nextAccess = await apiRequest<EmployeeManagerAccess>(
        `/employees/${employeeId}/manager-access`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            grantManagerAccess: nextValue,
          }),
        },
      );
      setManagerAccess(nextAccess);
      setNotice({
        kind: "success",
        text: nextValue
          ? locale === "ru"
            ? "Сотрудник переведён в менеджеры."
            : "Employee promoted to manager."
          : locale === "ru"
            ? "Сотрудник переведён в обычные работники."
            : "Employee moved back to regular staff.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось изменить роль сотрудника."
              : "Failed to update employee role.",
      });
    } finally {
      setRoleActionPending(false);
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
            {locale === "ru" ? "Сотрудники" : "Employees"}
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            {employee?.avatarUrl ? (
              <img
                alt={
                  employee
                    ? fullName
                    : locale === "ru"
                      ? "Фото сотрудника"
                      : "Employee photo"
                }
                className="size-14 rounded-full object-cover"
                src={employee.avatarUrl}
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-[#eef3ff] text-sm font-semibold text-[#546cf2]">
                {employeeInitials}
              </div>
            )}
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {fullName}
              </h1>
              {employee && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="size-3.5" />
                    {employee.position.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {employee.primaryLocation.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {employee.department.name}
                  </span>
                </p>
              )}
              {managerAccess ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      managerAccess.hasAdminRole
                        ? "bg-violet-50 text-violet-700"
                        : managerAccess.hasManagerAccess
                          ? "bg-sky-50 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {managerAccess.hasAdminRole
                      ? locale === "ru"
                        ? "Админ"
                        : "Admin"
                      : managerAccess.hasManagerAccess
                        ? locale === "ru"
                          ? "Менеджер"
                          : "Manager"
                        : locale === "ru"
                          ? "Сотрудник"
                          : "Employee"}
                  </span>
                </div>
              ) : null}
            </div>
            {canManageRoles && managerAccess?.canToggleManagerAccess ? (
              <button
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={roleActionPending}
                onClick={() => void handleToggleManagerAccess()}
                type="button"
              >
                {roleActionPending
                  ? locale === "ru"
                    ? "Обновляем..."
                    : "Updating..."
                  : managerAccess.hasManagerAccess
                    ? locale === "ru"
                      ? "Сделать обычным сотрудником"
                      : "Downgrade to employee"
                    : locale === "ru"
                      ? "Сделать менеджером"
                      : "Make manager"}
              </button>
            ) : null}
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
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                key={t.key}
                onClick={() => setTab(t.key)}
                type="button"
              >
                <Icon className="size-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-sm font-semibold leading-none ${
                      tab === t.key ? "text-white/90" : "text-muted-foreground"
                    }`}
                  >
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
              notice.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-3">
          {/* ─── Attendance ─── */}
          {tab === "attendance" && (
            <>
              {history === null ? (
                <SectionState
                  icon={Clock}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить историю посещаемости."
                      : "Failed to load attendance history."
                  }
                  tone="error"
                />
              ) : history.rows.length > 0 ? (
                <div className="team-tasks-table-card">
                  <div className="team-tasks-table-shell">
                    <Table
                      aria-label={
                        locale === "ru"
                          ? "История посещаемости"
                          : "Attendance history"
                      }
                      onRowAction={(key) =>
                        setSelectedAttendanceSessionId(String(key))
                      }
                      size="sm"
                    >
                      <Table.Header>
                        <Table.Head
                          className="min-w-[130px]"
                          id="date"
                          isRowHeader
                          label={locale === "ru" ? "Дата" : "Date"}
                        />
                        <Table.Head id="checkIn" label="Check-in" />
                        <Table.Head id="checkOut" label="Check-out" />
                        <Table.Head
                          id="worked"
                          label={locale === "ru" ? "Отработано" : "Worked"}
                        />
                        <Table.Head
                          id="breaks"
                          label={locale === "ru" ? "Перерывы" : "Breaks"}
                        />
                        <Table.Head
                          id="late"
                          label={locale === "ru" ? "Опоздание" : "Late"}
                        />
                        <Table.Head
                          id="earlyLeave"
                          label={
                            locale === "ru" ? "Ранний уход" : "Early leave"
                          }
                        />
                        <Table.Head
                          id="status"
                          label={locale === "ru" ? "Статус" : "Status"}
                        />
                      </Table.Header>
                      <Table.Body items={history.rows}>
                        {(row) => (
                          <Table.Row
                            className="team-tasks-table-row cursor-pointer"
                            id={row.sessionId}
                          >
                            <Table.Cell className="font-medium">
                              {formatDate(row.startedAt)}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-1.5">
                                <span className="text-green-600">
                                  {formatTime(row.checkInEvent.occurredAt)}
                                </span>
                                {row.checkInEvent.distanceMeters !== null ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {row.checkInEvent.distanceMeters}
                                    {locale === "ru" ? "м" : "m"}
                                  </span>
                                ) : null}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              {row.checkOutEvent ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-red-500">
                                    {formatTime(row.checkOutEvent.occurredAt)}
                                  </span>
                                  {row.checkOutEvent.distanceMeters !== null ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      {row.checkOutEvent.distanceMeters}
                                      {locale === "ru" ? "м" : "m"}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-amber-500">
                                  {locale === "ru" ? "На смене" : "On shift"}
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell className="font-medium">
                              {formatHours(row.workedMinutes)}
                            </Table.Cell>
                            <Table.Cell className="text-muted-foreground">
                              {formatHours(row.breakMinutes)}
                            </Table.Cell>
                            <Table.Cell>
                              {row.lateMinutes > 0 ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                  {row.lateMinutes}
                                  {locale === "ru" ? "м" : "m"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {row.earlyLeaveMinutes > 0 ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                  {row.earlyLeaveMinutes}
                                  {locale === "ru" ? "м" : "m"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {row.status === "on_shift" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                                  {locale === "ru" ? "На смене" : "On shift"}
                                </span>
                              ) : row.status === "on_break" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  {locale === "ru" ? "Перерыв" : "Break"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <CheckCircle2 className="size-3.5 text-green-500" />
                                  {locale === "ru" ? "Завершено" : "Done"}
                                </span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table>
                  </div>
                </div>
              ) : (
                <SectionState
                  icon={Clock}
                  message={
                    locale === "ru"
                      ? "Нет записей посещаемости"
                      : "No attendance records"
                  }
                />
              )}
            </>
          )}

          {/* ─── Biometric ─── */}
          {tab === "biometric" && (
            <>
              {biometricHistory === null ? (
                <SectionState
                  icon={ScanFace}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить биометрические данные сотрудника."
                      : "Failed to load biometric records for this employee."
                  }
                  tone="error"
                />
              ) : (
                <>
                  <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-center gap-2 text-center">
                        <ScanFace className="size-4 text-accent" />
                        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          {locale === "ru"
                            ? "Эталонная биометрия"
                            : "Reference biometric"}
                        </h3>
                      </div>
                      {primaryBiometricUrl ? (
                        <img
                          alt={
                            locale === "ru"
                              ? "Эталонное лицо сотрудника"
                              : "Reference employee face"
                          }
                          className="h-72 w-full rounded-2xl object-cover"
                          src={primaryBiometricUrl}
                        />
                      ) : (
                        <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                          {locale === "ru"
                            ? "Сотрудник ещё не завершил первичную регистрацию лица."
                            : "The employee has not completed initial face registration yet."}
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <dl className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru" ? "Статус" : "Status"}
                          </dt>
                          <dd
                            className={`font-semibold ${biometricStatusClassName}`}
                          >
                            {biometricStatusLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru"
                              ? "Дата регистрации"
                              : "Registered at"}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {biometricEnrolledAt
                              ? formatDate(biometricEnrolledAt)
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru"
                              ? "Последняя проверка"
                              : "Last verified"}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {biometricLastVerifiedAt
                              ? formatDate(biometricLastVerifiedAt)
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  {biometricHistory.verifications.length > 0 ? (
                    <div className="team-tasks-table-card">
                      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
                        <div>
                          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                            {locale === "ru"
                              ? "История верификаций"
                              : "Verification history"}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {locale === "ru"
                              ? "Автоматические сканы лица за последние 7 дней и связанные события посещаемости."
                              : "Automatic face scans from the last 7 days and linked attendance events."}
                          </p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                          {biometricHistory.verifications.length}
                        </span>
                      </div>
                      <div
                        className="team-tasks-table-shell overflow-y-auto"
                        style={{ maxHeight: "428px" }}
                      >
                        <Table
                          aria-label={
                            locale === "ru"
                              ? "История верификаций"
                              : "Verification history"
                          }
                          onRowAction={(key) =>
                            setSelectedVerificationId(String(key))
                          }
                          size="sm"
                        >
                          <Table.Header className="sticky top-0 z-[1]">
                            <Table.Head
                              className="min-w-[150px]"
                              id="capturedAt"
                              isRowHeader
                              label={locale === "ru" ? "Дата" : "Date"}
                            />
                            <Table.Head
                              id="result"
                              label={locale === "ru" ? "Результат" : "Result"}
                            />
                            <Table.Head id="liveness" label="Liveness" />
                            <Table.Head id="match" label="Match" />
                            <Table.Head
                              id="event"
                              label={locale === "ru" ? "Событие" : "Event"}
                            />
                            <Table.Head
                              id="note"
                              label={locale === "ru" ? "Примечание" : "Note"}
                            />
                          </Table.Header>
                          <Table.Body items={biometricHistory.verifications}>
                            {(v) => (
                              <Table.Row
                                className="team-tasks-table-row cursor-pointer"
                                id={v.id}
                              >
                                <Table.Cell className="font-medium">
                                  {formatDate(v.capturedAt)}
                                  <br />
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(v.capturedAt)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      v.result === "PASSED"
                                        ? "bg-green-50 text-green-700"
                                        : v.result === "REVIEW"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {v.result === "PASSED" ? (
                                      <CheckCircle2 className="size-3" />
                                    ) : v.result === "FAILED" ? (
                                      <XCircle className="size-3" />
                                    ) : (
                                      <ShieldAlert className="size-3" />
                                    )}
                                    {v.result}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  {v.livenessScore !== null
                                    ? `${Math.round(v.livenessScore * 100)}%`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell>
                                  {v.matchScore !== null
                                    ? `${Math.round(v.matchScore * 100)}%`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell className="text-xs text-muted-foreground">
                                  {v.attendanceEvent
                                    ? `${v.attendanceEvent.eventType} ${formatDateTime(v.attendanceEvent.occurredAt)}`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell className="text-xs">
                                  {v.reviewReason ?? "—"}
                                </Table.Cell>
                              </Table.Row>
                            )}
                          </Table.Body>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <SectionState
                      icon={ScanFace}
                      message={
                        locale === "ru"
                          ? "Нет записей верификации"
                          : "No verification records"
                      }
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* ─── Anomalies ─── */}
          {tab === "anomalies" && (
            <>
              {anomalies === null ? (
                <SectionState
                  icon={ShieldAlert}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить аномалии по сотруднику."
                      : "Failed to load anomalies for this employee."
                  }
                  tone="error"
                />
              ) : anomalies.items.length > 0 ? (
                <div className="space-y-2">
                  {anomalies.items.map((item) => (
                    <div
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                      key={item.anomalyId}
                    >
                      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="font-medium text-foreground">
                          {item.summary}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <SectionState
                  icon={CheckCircle2}
                  message={
                    locale === "ru"
                      ? "Аномалий не обнаружено"
                      : "No anomalies found"
                  }
                />
              )}
            </>
          )}

          {/* ─── Info ─── */}
          {tab === "info" &&
            (employee ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <User className="size-4" />
                    {locale === "ru" ? "Личные данные" : "Personal"}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Имя" : "Name"}
                      </dt>
                      <dd className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{employee.user.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Дата найма" : "Hire date"}
                      </dt>
                      <dd className="font-medium">
                        {formatDate(employee.hireDate)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <Briefcase className="size-4" />
                    {locale === "ru" ? "Организация" : "Organization"}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Отдел" : "Department"}
                      </dt>
                      <dd className="font-medium">
                        {employee.department.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Должность" : "Position"}
                      </dt>
                      <dd className="font-medium">{employee.position.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Локация" : "Location"}
                      </dt>
                      <dd className="font-medium">
                        {employee.primaryLocation.name}
                      </dd>
                    </div>
                    {managerAccess ? (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          {locale === "ru" ? "Роль доступа" : "Access role"}
                        </dt>
                        <dd className="font-medium">
                          {managerAccess.hasAdminRole
                            ? locale === "ru"
                              ? "Администратор"
                              : "Administrator"
                            : managerAccess.hasManagerAccess
                              ? locale === "ru"
                                ? "Менеджер"
                                : "Manager"
                              : locale === "ru"
                                ? "Сотрудник"
                                : "Employee"}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <Monitor className="size-4" />
                    {locale === "ru" ? "Устройства" : "Devices"}
                  </h3>
                  {employee.devices.length > 0 ? (
                    <div className="space-y-2">
                      {employee.devices.map((device) => (
                        <div
                          className="flex flex-col gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                          key={device.id}
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {device.deviceName ??
                                formatDevicePlatform(device.platform, locale)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDevicePlatform(device.platform, locale)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.isPrimary && (
                              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                {locale === "ru" ? "Основное" : "Primary"}
                              </span>
                            )}
                            <button
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={deviceActionId === device.id}
                              onClick={() =>
                                void handleDetachDevice(
                                  device.id,
                                  device.deviceName ??
                                    formatDevicePlatform(
                                      device.platform,
                                      locale,
                                    ),
                                )
                              }
                              type="button"
                            >
                              {deviceActionId === device.id
                                ? locale === "ru"
                                  ? "Отвязываем..."
                                  : "Detaching..."
                                : locale === "ru"
                                  ? "Отвязать устройство"
                                  : "Detach device"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === "ru"
                        ? "Устройства не зарегистрированы"
                        : "No devices registered"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <SectionState
                icon={User}
                message={
                  locale === "ru"
                    ? "Не удалось загрузить профиль сотрудника."
                    : "Failed to load the employee profile."
                }
                tone="error"
              />
            ))}
        </div>

        <Dialog
          open={Boolean(selectedAttendanceSession)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAttendanceSessionId(null);
            }
          }}
        >
          <DialogContent className="w-[min(1080px,calc(100vw-2rem))]">
            <DialogHeader>
              <DialogTitle>
                {locale === "ru"
                  ? "Биометрия смены"
                  : "Shift biometric verification"}
              </DialogTitle>
              <DialogDescription>
                {selectedAttendanceSession
                  ? `${formatDate(selectedAttendanceSession.startedAt)} • ${
                      locale === "ru" ? "Смена" : "Shift"
                    }`
                  : locale === "ru"
                    ? "Скан check-in и check-out для выбранной смены."
                    : "Check-in and check-out scans for the selected shift."}
              </DialogDescription>
            </DialogHeader>

            {selectedAttendanceSession ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    key: "check-in",
                    label: "Check-in",
                    verification: selectedCheckInVerification,
                    occurredAt: selectedAttendanceSession.checkInEvent.occurredAt,
                  },
                  {
                    key: "check-out",
                    label: "Check-out",
                    verification: selectedCheckOutVerification,
                    occurredAt:
                      selectedAttendanceSession.checkOutEvent?.occurredAt ?? null,
                  },
                ].map((item) => {
                  const previewArtifact =
                    item.verification?.artifacts.find((artifact) => artifact.url) ??
                    null;

                  return (
                    <div
                      className="rounded-2xl border border-border bg-card p-4"
                      key={item.key}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                            {item.label}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.occurredAt
                              ? `${formatDate(item.occurredAt)} ${formatTime(item.occurredAt)}`
                              : locale === "ru"
                                ? "Событие не записано"
                                : "Event not recorded"}
                          </p>
                        </div>
                        {item.verification ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.verification.result === "PASSED"
                                ? "bg-green-50 text-green-700"
                                : item.verification.result === "REVIEW"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.verification.result}
                          </span>
                        ) : null}
                      </div>

                      {previewArtifact?.url ? (
                        <img
                          alt={
                            locale === "ru"
                              ? `Биометрия ${item.label}`
                              : `${item.label} biometric`
                          }
                          className="mb-3 h-72 w-full rounded-2xl border border-border object-cover"
                          src={previewArtifact.url}
                        />
                      ) : (
                        <div className="mb-3 flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                          {item.occurredAt
                            ? locale === "ru"
                              ? "Для этого события не найдено сохранённое фото биометрии."
                              : "No saved biometric photo was found for this event."
                            : locale === "ru"
                              ? "Check-out ещё не записан."
                              : "Check-out has not been recorded yet."}
                        </div>
                      )}

                      <dl className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2">
                          <dt className="text-muted-foreground">Liveness</dt>
                          <dd className="font-medium text-foreground">
                            {item.verification?.livenessScore !== null &&
                            item.verification?.livenessScore !== undefined
                              ? `${Math.round(item.verification.livenessScore * 100)}%`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2">
                          <dt className="text-muted-foreground">Match</dt>
                          <dd className="font-medium text-foreground">
                            {item.verification?.matchScore !== null &&
                            item.verification?.matchScore !== undefined
                              ? `${Math.round(item.verification.matchScore * 100)}%`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedVerification)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVerificationId(null);
            }
          }}
        >
          <DialogContent className="w-[min(880px,calc(100vw-2rem))]">
            <DialogHeader>
              <DialogTitle>
                {locale === "ru" ? "Фото верификации" : "Verification photo"}
              </DialogTitle>
              <DialogDescription>
                {selectedVerification
                  ? `${formatDate(selectedVerification.capturedAt)} ${formatTime(selectedVerification.capturedAt)}`
                  : locale === "ru"
                    ? "Артефакты верификации сотрудника."
                    : "Employee verification artifacts."}
              </DialogDescription>
            </DialogHeader>

            {selectedVerification ? (
              selectedVerificationArtifacts.length > 0 ? (
                <div className="space-y-4">
                  <img
                    alt={
                      locale === "ru"
                        ? "Загруженное фото верификации"
                        : "Uploaded verification photo"
                    }
                    className="max-h-[68vh] w-full rounded-2xl border border-border object-contain"
                    src={selectedVerificationArtifacts[0].url ?? undefined}
                  />
                  {selectedVerificationArtifacts.length > 1 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {selectedVerificationArtifacts.map((artifact) => (
                        <img
                          alt={
                            locale === "ru"
                              ? "Артефакт верификации"
                              : "Verification artifact"
                          }
                          className="aspect-square w-full rounded-xl border border-border object-cover"
                          key={artifact.id}
                          src={artifact.url ?? undefined}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  {locale === "ru"
                    ? "У этой верификации нет сохранённого фото."
                    : "This verification does not have a saved photo."}
                </div>
              )
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </AdminShell>
  );
}
