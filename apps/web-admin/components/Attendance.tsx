"use client";

import { getLocalTimeZone, parseDate } from "@internationalized/date";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttendanceAuditResponse,
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  AttendanceLiveSession,
} from "@smart/types";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  LogIn,
  LogOut,
  Search,
  X,
} from "lucide-react";
import type { SortDescriptor } from "react-aria-components";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { Table } from "@/components/application/table/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AttendanceAuditMap } from "@/components/AttendanceAuditMap";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getRuntimeLocale, getRuntimeLocaleTag, runtimeLocalize } from "@/lib/runtime-locale";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";
import { cn } from "@/lib/utils";

type ViewMode = "today" | "period";
type TodayFilter = "all" | "online" | "late" | "break" | "offline";
type Preset = "week" | "2weeks" | "custom";
type AttendanceStatus = Exclude<TodayFilter, "all">;

type EmployeeRecord = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  position: { name: string } | null;
  department: { name: string } | null;
  primaryLocation: { name: string } | null;
  avatarUrl?: string | null;
};

type AttendanceCard = {
  id: string;
  name: string;
  employeeNumber: string;
  position: string;
  department: string;
  location: string;
  status: AttendanceStatus;
  statusLabel: string;
  progress: number;
  progressTone: "success" | "warning" | "danger" | "accent";
  summary: string;
  schedule: string;
  arrival: string | null;
  departure: string | null;
  checkInDistanceMeters: number | null;
  checkOutDistanceMeters: number | null;
  workedMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  anomalies: AttendanceAnomalyResponse["items"];
  breaks: AttendanceHistoryResponse["rows"][number]["breaks"];
};

type PeriodSummaryRow = {
  id: string;
  name: string;
  position: string;
  employeeNumber: string;
  total: number;
  ontime: number;
  late: number;
  earlyLeave: number;
  missed: number;
  workedMinutes: number;
  attendanceRate: number;
};

type PeriodSortColumn =
  | "employeeName"
  | "total"
  | "ontime"
  | "late"
  | "earlyLeave"
  | "missed"
  | "workedMinutes"
  | "attendanceRate";

type AuditItem = AttendanceAuditResponse["items"][number];

export type AttendanceInitialData = {
  anomalies: AttendanceAnomalyResponse | null;
  audit: AttendanceAuditResponse | null;
  dateFrom: string;
  dateTo: string;
  employees: EmployeeRecord[];
  history: AttendanceHistoryResponse | null;
  liveSessions: AttendanceLiveSession[];
};

const statusDotClass: Record<AttendanceStatus, string> = {
  online: "bg-[color:var(--success)]",
  late: "bg-[color:var(--warning)]",
  break: "bg-[color:var(--accent)]",
  offline: "bg-[color:var(--muted-foreground)]",
};

const statusBadgeClass: Record<AttendanceStatus, string> = {
  online: "bg-[color:var(--soft-success)] text-[color:var(--success)]",
  late: "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
  break: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  offline: "bg-[rgba(117,117,117,0.12)] text-[color:var(--muted-foreground)]",
};

const statusTextClass: Record<AttendanceStatus, string> = {
  online: "text-[color:var(--success)]",
  late: "text-[color:var(--warning)]",
  break: "text-[color:var(--accent-strong)]",
  offline: "text-[color:var(--muted-foreground)]",
};

const progressToneClass: Record<
  AttendanceCard["progressTone"],
  string
> = {
  success: "bg-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]",
  danger: "bg-[color:var(--danger)]",
  accent: "bg-[color:var(--accent)]",
};

const attendanceStatusWeight: Record<AttendanceStatus, number> = {
  online: 0,
  break: 1,
  late: 2,
  offline: 3,
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCalendarDateRangeInput(startValue: string, endValue: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startValue) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endValue)
  ) {
    return null;
  }

  try {
    const start = parseDate(startValue);
    const end = parseDate(endValue);

    return {
      start: start.compare(end) <= 0 ? start : end,
      end: start.compare(end) <= 0 ? end : start,
    };
  } catch {
    return null;
  }
}

function shiftDate(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatHumanDate(value: string) {
  return parseDateKey(value).toLocaleDateString(getRuntimeLocaleTag(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHumanRange(dateFrom: string, dateTo: string) {
  return `${formatHumanDate(dateFrom)} - ${formatHumanDate(dateTo)}`;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(getRuntimeLocaleTag(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value: number) {
  if (!value) return runtimeLocalize("0 мин", "0 min");
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (getRuntimeLocale() === "en") {
    if (hours && minutes) return `${hours} h ${minutes} min`;
    if (hours) return `${hours} h`;
    return `${minutes} min`;
  }
  if (hours && minutes) return `${hours} ч ${minutes} мин`;
  if (hours) return `${hours} ч`;
  return `${minutes} мин`;
}

function formatDistance(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return getRuntimeLocale() === "ru"
    ? `${Math.round(value)} м`
    : `${Math.round(value)} m`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatAuditEventType(value: AuditItem["eventType"]) {
  if (value === "CHECK_IN") return runtimeLocalize("Приход", "Check-in");
  if (value === "CHECK_OUT") return runtimeLocalize("Уход", "Check-out");
  if (value === "BREAK_START") {
    return runtimeLocalize("Начало перерыва", "Break start");
  }
  return runtimeLocalize("Конец перерыва", "Break end");
}

function formatBiometricResult(value: NonNullable<AuditItem["biometricVerification"]>["result"]) {
  if (value === "PASSED") return runtimeLocalize("Лицо подтверждено", "Face verified");
  if (value === "FAILED") return runtimeLocalize("Лицо не подтверждено", "Face not verified");
  return runtimeLocalize("Нужна ручная проверка", "Manual review required");
}

function formatAuditSource(value: AuditItem["source"]) {
  return value === "AUDIT_LOG"
    ? runtimeLocalize("Отказанная попытка", "Rejected attempt")
    : runtimeLocalize("Событие посещаемости", "Attendance event");
}

function formatFailureReason(value: string | null) {
  if (!value) return runtimeLocalize("Не указана", "Not specified");
  if (value === "Unregistered device fingerprint.") {
    return runtimeLocalize("Устройство не зарегистрировано", "Device is not registered");
  }
  if (value === "Current device is not the employee primary device.") {
    return runtimeLocalize("Попытка с неосновного устройства", "Attempt from a non-primary device");
  }
  if (value === "Employee is outside the allowed work area.") {
    return runtimeLocalize("Попытка вне разрешенной геозоны", "Attempt outside the allowed geofence");
  }
  return value;
}

function getProgressTone(value: number): AttendanceCard["progressTone"] {
  if (value >= 85) return "success";
  if (value >= 55) return "accent";
  if (value >= 30) return "warning";
  return "danger";
}

function buildFullName(employee: EmployeeRecord) {
  return `${employee.lastName} ${employee.firstName}`.trim();
}

function buildSearchText(employee: EmployeeRecord) {
  return [
    buildFullName(employee),
    employee.position?.name ?? "",
    employee.department?.name ?? "",
    employee.primaryLocation?.name ?? "",
    employee.employeeNumber ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function ProgressBar({
  value,
  tone,
  className,
}: {
  value: number;
  tone: AttendanceCard["progressTone"];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-[color:var(--panel-muted)]",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          progressToneClass[tone],
        )}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  );
}

function AttendanceAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-[11px]"
      : size === "lg"
        ? "h-14 w-14 text-base"
        : "h-11 w-11 text-xs";

  if (avatarUrl) {
    return (
      <img
        alt={name}
        className={cn(
          "rounded-2xl border border-[color:var(--border)] object-cover",
          sizeClass,
        )}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-[color:var(--panel-muted)] font-semibold text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
        sizeClass,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export default function Attendance({
  initialData,
}: {
  initialData?: AttendanceInitialData | null;
}) {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const locale = getRuntimeLocale();
  const session = getSession();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [search, setSearch] = useState("");
  const [todayFilter, setTodayFilter] = useState<TodayFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("week");
  const [periodSortDescriptor, setPeriodSortDescriptor] =
    useState<SortDescriptor>({
      column: "employeeName",
      direction: "ascending",
    });
  const [todayDate, setTodayDate] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState(() =>
    formatDateKey(shiftDate(new Date(), -6)),
  );
  const [rangeTo, setRangeTo] = useState(() => formatDateKey(new Date()));
  const [employees, setEmployees] = useState<EmployeeRecord[]>(
    initialData?.employees ?? [],
  );
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(
    initialData?.liveSessions ?? [],
  );
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(
    initialData?.history ?? null,
  );
  const [audit, setAudit] = useState<AttendanceAuditResponse | null>(
    initialData?.audit ?? null,
  );
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    initialData?.anomalies ?? null,
  );
  const [selectedAuditEventId, setSelectedAuditEventId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const didUseInitialRange = useRef(Boolean(initialData));
  const todayFilters: Array<{ key: TodayFilter; label: string }> = [
    { key: "all", label: runtimeLocalize("Все", "All", locale) },
    { key: "online", label: runtimeLocalize("На месте", "On site", locale) },
    { key: "late", label: runtimeLocalize("Опоздали", "Late", locale) },
    { key: "offline", label: runtimeLocalize("Нет отметки", "No punch", locale) },
  ];
  const periodPresets: Array<{ key: Preset; label: string }> = [
    { key: "week", label: runtimeLocalize("7 дней", "7 days", locale) },
    { key: "2weeks", label: runtimeLocalize("14 дней", "14 days", locale) },
    { key: "custom", label: runtimeLocalize("Свой период", "Custom", locale) },
  ];

  const activeDateFrom =
    viewMode === "today" ? formatDateKey(todayDate) : rangeFrom || rangeTo;
  const activeDateTo =
    viewMode === "today" ? formatDateKey(todayDate) : rangeTo || rangeFrom;

  async function loadAttendanceSnapshot(options?: {
    force?: boolean;
    silent?: boolean;
  }) {
    const session = getSession();
    if (!session) {
      if (!options?.silent) {
        setHistory(null);
        setAnomalies(null);
        setLiveSessions([]);
        setAudit(null);
        setIsLoading(false);
        setError(runtimeLocalize("Сессия не найдена. Войди заново.", "Session not found. Sign in again.", locale));
      }
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const query = new URLSearchParams({
        dateFrom: activeDateFrom,
        dateTo: activeDateTo,
      }).toString();
      const snapshot = await apiRequest<AttendanceInitialData>(
        `/bootstrap/attendance?${query}`,
        {
          token: session.accessToken,
          skipClientCache: options?.force ?? false,
        },
      );

      setEmployees(snapshot.employees);
      setHistory(snapshot.history);
      setAnomalies(snapshot.anomalies);
      setLiveSessions(snapshot.liveSessions);
      setAudit(snapshot.audit);
      setError(null);
    } catch (requestError) {
      if (!options?.silent) {
        setEmployees([]);
        setHistory(null);
        setAnomalies(null);
        setLiveSessions([]);
        setAudit(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : runtimeLocalize("Не удалось загрузить посещаемость.", "Failed to load attendance.", locale),
        );
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!activeDateFrom || !activeDateTo) return;

    if (
      didUseInitialRange.current &&
      initialData &&
      activeDateFrom === initialData.dateFrom &&
      activeDateTo === initialData.dateTo
    ) {
      didUseInitialRange.current = false;
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    void loadAttendanceSnapshot({ force: true }).finally(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeDateFrom, activeDateTo, initialData]);

  useWorkspaceAutoRefresh({
    session,
    enabled: Boolean(session),
    onRefresh: async () => {
      await loadAttendanceSnapshot({
        force: true,
        silent: true,
      });
    },
  });

  useEffect(() => {
    if (!audit?.items.length) {
      setSelectedAuditEventId(null);
      return;
    }

    if (
      !selectedAuditEventId ||
      !audit.items.some((item) => item.eventId === selectedAuditEventId)
    ) {
      setSelectedAuditEventId(audit.items[0].eventId);
    }
  }, [audit, selectedAuditEventId]);

  const historyByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceHistoryResponse["rows"]>();
    for (const row of history?.rows ?? []) {
      const list = map.get(row.employeeId) ?? [];
      list.push(row);
      map.set(row.employeeId, list);
    }
    return map;
  }, [history]);

  const anomaliesByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceAnomalyResponse["items"]>();
    for (const item of anomalies?.items ?? []) {
      const list = map.get(item.employeeId) ?? [];
      list.push(item);
      map.set(item.employeeId, list);
    }
    return map;
  }, [anomalies]);

  const todayCards = useMemo<AttendanceCard[]>(() => {
    return employees
      .map((employee) => {
        const rows = historyByEmployee.get(employee.id) ?? [];
        const anomaliesForEmployee = anomaliesByEmployee.get(employee.id) ?? [];
        const row = rows[0] ?? null;

        let status: AttendanceStatus = "offline";
        let statusLabel = runtimeLocalize("Нет отметки", "No punch", locale);

        if (row?.status === "on_break") {
          status = "online";
          statusLabel = runtimeLocalize("На месте", "On site", locale);
        } else if (row?.lateMinutes && row.lateMinutes > 0) {
          status = "late";
          statusLabel =
            locale === "ru"
              ? `Опоздание ${row.lateMinutes} мин`
              : `${row.lateMinutes} min late`;
        } else if (row?.status === "on_shift") {
          status = "online";
          statusLabel = runtimeLocalize("На месте", "On site", locale);
        } else if (row?.status === "checked_out") {
          status = "offline";
          statusLabel = runtimeLocalize("Смена завершена", "Shift completed", locale);
        } else if (anomaliesForEmployee.length > 0) {
          status = anomaliesForEmployee.some(
            (item) => item.severity === "critical",
          )
            ? "offline"
            : "late";
          statusLabel =
            anomaliesForEmployee[0]?.summary ??
            runtimeLocalize("Есть предупреждение", "Warning", locale);
        }

        const progress = clampPercent(
          row ? (row.workedMinutes / 480) * 100 : 0,
        );
        const progressTone = getProgressTone(progress);

        let summary = runtimeLocalize(
          "Нет активности за выбранный день",
          "No activity for the selected day",
          locale,
        );
        if (row) {
          summary =
            locale === "ru"
              ? `Отработано ${formatMinutes(row.workedMinutes)}`
              : `Worked ${formatMinutes(row.workedMinutes)}`;
        } else if (anomaliesForEmployee.length > 0) {
          summary = anomaliesForEmployee[0]?.summary ?? summary;
        }

        return {
          id: employee.id,
          name: buildFullName(employee),
          employeeNumber: employee.employeeNumber,
          position: employee.position?.name ?? runtimeLocalize("Сотрудник", "Employee", locale),
          department:
            employee.department?.name ?? runtimeLocalize("Без отдела", "No department", locale),
          location: row?.location ?? employee.primaryLocation?.name ?? runtimeLocalize("Не указан", "Not specified", locale),
          status,
          statusLabel,
          progress,
          progressTone,
          summary,
          schedule: row?.shiftLabel ?? runtimeLocalize("Смена не назначена", "No shift assigned", locale),
          arrival: row?.startedAt ?? null,
          departure: row?.endedAt ?? null,
          checkInDistanceMeters: row?.checkInEvent.distanceMeters ?? null,
          checkOutDistanceMeters: row?.checkOutEvent?.distanceMeters ?? null,
          workedMinutes: row?.workedMinutes ?? 0,
          breakMinutes: row?.breakMinutes ?? 0,
          lateMinutes: row?.lateMinutes ?? 0,
          earlyLeaveMinutes: row?.earlyLeaveMinutes ?? 0,
          anomalies: anomaliesForEmployee,
          breaks: row?.breaks ?? [],
        };
      })
      .sort((left, right) => {
        const statusDiff =
          attendanceStatusWeight[left.status] - attendanceStatusWeight[right.status];
        if (statusDiff !== 0) {
          return statusDiff;
        }
        return left.name.localeCompare(right.name, "ru");
      });
  }, [anomaliesByEmployee, employees, historyByEmployee]);

  const filteredTodayCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return todayCards.filter((card) => {
      const matchesFilter =
        todayFilter === "all" ? true : card.status === todayFilter;
      const matchesSearch =
        query.length === 0 ||
        [
          card.name,
          card.position,
          card.department,
          card.location,
          card.employeeNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [search, todayCards, todayFilter]);

  useEffect(() => {
    if (!filteredTodayCards.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredTodayCards.some((card) => card.id === selectedId)) {
      setSelectedId(filteredTodayCards[0]?.id ?? null);
    }
  }, [filteredTodayCards, selectedId]);

  const selectedCard =
    filteredTodayCards.find((card) => card.id === selectedId) ?? null;

  const todayCounts = useMemo<Record<TodayFilter, number>>(() => {
    return {
      all: todayCards.length,
      online: todayCards.filter((item) => item.status === "online").length,
      late: todayCards.filter((item) => item.status === "late").length,
      break: 0,
      offline: todayCards.filter((item) => item.status === "offline").length,
    };
  }, [todayCards]);

  const selectedAuditItem =
    audit?.items.find((item) => item.eventId === selectedAuditEventId) ?? null;

  const periodRows = useMemo<PeriodSummaryRow[]>(() => {
    const query = search.trim().toLowerCase();

    return employees
      .filter((employee) => {
        if (!query) return true;
        return buildSearchText(employee).includes(query);
      })
      .map((employee) => {
        const rows = historyByEmployee.get(employee.id) ?? [];
        const anomalyItems = anomaliesByEmployee.get(employee.id) ?? [];
        const ontime = rows.filter(
          (row) => row.lateMinutes === 0 && row.earlyLeaveMinutes === 0,
        ).length;
        const late = rows.filter((row) => row.lateMinutes > 0).length;
        const earlyLeave = rows.filter((row) => row.earlyLeaveMinutes > 0).length;
        const missed = anomalyItems.filter((item) =>
          ["MISSED_CHECK_IN", "MISSED_CHECK_OUT"].includes(item.type),
        ).length;
        const workedMinutes = rows.reduce(
          (total, row) => total + row.workedMinutes,
          0,
        );
        const attendanceRate =
          rows.length > 0 ? clampPercent((ontime / rows.length) * 100) : 0;

        return {
          id: employee.id,
          name: buildFullName(employee),
          position: employee.position?.name ?? runtimeLocalize("Сотрудник", "Employee", locale),
          employeeNumber: employee.employeeNumber,
          total: rows.length,
          ontime,
          late,
          earlyLeave,
          missed,
          workedMinutes,
          attendanceRate,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, locale === "ru" ? "ru" : "en"));
  }, [anomaliesByEmployee, employees, historyByEmployee, locale, search]);

  const sortedPeriodRows = useMemo(() => {
    const { column, direction } = periodSortDescriptor;
    const sortDirection = direction === "descending" ? -1 : 1;

    return [...periodRows].sort((left, right) => {
      let comparison = 0;

      switch (column as PeriodSortColumn | undefined) {
        case "total":
          comparison = left.total - right.total;
          break;
        case "ontime":
          comparison = left.ontime - right.ontime;
          break;
        case "late":
          comparison = left.late - right.late;
          break;
        case "earlyLeave":
          comparison = left.earlyLeave - right.earlyLeave;
          break;
        case "missed":
          comparison = left.missed - right.missed;
          break;
        case "workedMinutes":
          comparison = left.workedMinutes - right.workedMinutes;
          break;
        case "attendanceRate":
          comparison = left.attendanceRate - right.attendanceRate;
          break;
        case "employeeName":
        default:
          comparison = left.name.localeCompare(right.name, "ru");
          break;
      }

      if (comparison === 0) {
        comparison = left.name.localeCompare(right.name, "ru");
      }

      return comparison * sortDirection;
    });
  }, [periodRows, periodSortDescriptor]);

  function handlePresetChange(nextPreset: Preset) {
    setPreset(nextPreset);

    if (nextPreset === "week") {
      setRangeFrom(formatDateKey(shiftDate(new Date(), -6)));
      setRangeTo(formatDateKey(new Date()));
    }

    if (nextPreset === "2weeks") {
      setRangeFrom(formatDateKey(shiftDate(new Date(), -13)));
      setRangeTo(formatDateKey(new Date()));
    }
  }

  return (
    <main className="page-shell">
      <section className="dashboard-card space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
              {runtimeLocalize("Посещаемость", "Attendance", locale)}
            </h2>
            {viewMode === "period" ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {runtimeLocalize(
                  "Сводка по посещаемости сотрудников за выбранный период.",
                  "Employee attendance summary for the selected period.",
                  locale,
                )}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {viewMode === "today" ? (
              <span className="px-1 text-sm font-medium text-[color:var(--foreground)]">
                {formatHumanDate(activeDateFrom)}
              </span>
            ) : null}

            <div className="flex rounded-2xl border border-[color:var(--border)] bg-white p-1">
              <button
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
                  viewMode === "today"
                    ? "bg-[color:var(--accent)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                )}
                onClick={() => setViewMode("today")}
                type="button"
              >
                <Activity className="h-4 w-4" />
                {runtimeLocalize("Сегодня", "Today", locale)}
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
                  viewMode === "period"
                    ? "bg-[color:var(--accent)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                )}
                onClick={() => setViewMode("period")}
                type="button"
              >
                <CalendarDays className="h-4 w-4" />
                {runtimeLocalize("Период", "Period", locale)}
              </button>
            </div>
          </div>
        </div>

        {viewMode === "today" ? (
          <>
            <div className="flex w-fit flex-wrap overflow-hidden rounded-xl border border-border">
              {todayFilters.map((filter) => (
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors",
                    todayFilter === filter.key
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  key={filter.key}
                  onClick={() => setTodayFilter(filter.key)}
                  type="button"
                >
                  {filter.label}
                  <span className={todayFilter === filter.key ? "text-white/80" : "opacity-70"}>
                    {todayCounts[filter.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                  <Input
                    className="pl-10"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={runtimeLocalize(
                      "Поиск сотрудника, должности, локации...",
                      "Search employee, role, location...",
                      locale,
                    )}
                    value={search}
                  />
                </div>

                {error ? (
                  <div className="rounded-[24px] border border-[color:var(--soft-danger)] bg-[color:var(--panel-muted)] px-5 py-6 text-sm text-[color:var(--danger)]">
                    {error}
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-muted)] px-5 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                    {runtimeLocalize(
                      "Загружаю посещаемость...",
                      "Loading attendance...",
                      locale,
                    )}
                  </div>
                ) : null}

                {!isLoading && !error ? (
                  <div>
                    {filteredTodayCards.map((card, index) => (
                      <div
                        className="animate-fade-in"
                        key={card.id}
                        style={{ animationDelay: `${index * 35}ms` }}
                      >
                        <button
                          className={cn(
                            "w-full rounded-[20px] px-4 py-4 text-left transition",
                            selectedId === card.id
                              ? "bg-secondary/45"
                              : "bg-transparent hover:bg-secondary/20",
                          )}
                          onClick={() =>
                            setSelectedId((current) =>
                              current === card.id ? null : card.id,
                            )
                          }
                          type="button"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <AttendanceAvatar name={card.name} size="md" />
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                                  statusDotClass[card.status],
                                )}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                                  {card.name}
                                </p>
                                <span
                                  className={cn(
                                    "text-[11px] font-semibold",
                                    statusTextClass[card.status],
                                  )}
                                >
                                  {card.statusLabel}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-xs text-[color:var(--muted-foreground)]">
                                {card.position} • {card.department} • {card.location}
                              </p>

                              <p className="mt-1 truncate text-xs text-[color:var(--muted-foreground)]">
                                {card.summary}
                              </p>
                            </div>

                            <div className="hidden shrink-0 md:grid md:min-w-[160px] md:gap-2 md:text-right">
                              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                                {card.arrival
                                  ? locale === "ru"
                                    ? `Приход ${formatTime(card.arrival)}`
                                    : `Check-in ${formatTime(card.arrival)}`
                                  : runtimeLocalize("Без прихода", "No check-in", locale)}
                              </span>
                              <div className="ml-auto w-full max-w-[140px]">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                                    {runtimeLocalize("Смена", "Shift", locale)}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[color:var(--foreground)]">
                                    {card.progress}%
                                  </span>
                                </div>
                                <ProgressBar tone={card.progressTone} value={card.progress} />
                              </div>
                            </div>
                          </div>
                        </button>
                        {index < filteredTodayCards.length - 1 ? (
                          <Separator className="bg-[color:var(--border)]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {!isLoading && !error && filteredTodayCards.length === 0 ? (
                  <div className="px-1 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                    {runtimeLocalize(
                      "Ничего не найдено по текущему фильтру",
                      "Nothing found for the current filter",
                      locale,
                    )}
                  </div>
                ) : null}
              </div>

              {selectedCard ? (
                <aside className="w-full shrink-0 xl:sticky xl:top-6 xl:w-[360px]">
                  <div className="dashboard-card space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <AttendanceAvatar name={selectedCard.name} size="lg" />
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white",
                              statusDotClass[selectedCard.status],
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-[color:var(--foreground)]">
                            {selectedCard.name}
                          </p>
                          <p className="text-sm text-[color:var(--muted-foreground)]">
                            {selectedCard.position}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {selectedCard.department} • {selectedCard.location}
                          </p>
                        </div>
                      </div>

                      <button
                        className="rounded-xl p-2 text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--panel-muted)] hover:text-[color:var(--foreground)]"
                        onClick={() => setSelectedId(null)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(40,75,255,0.14)] bg-[linear-gradient(180deg,rgba(225,231,255,0.92)_0%,rgba(255,255,255,0.96)_100%)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Покрытие смены", "Shift coverage", locale)}
                        </span>
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          {selectedCard.progress}%
                        </span>
                      </div>
                      <ProgressBar
                        className="h-2.5"
                        tone={selectedCard.progressTone}
                        value={selectedCard.progress}
                      />
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[color:var(--muted-foreground)]">
                        <span>
                          {locale === "ru"
                            ? `Отработано ${formatMinutes(selectedCard.workedMinutes)}`
                            : `Worked ${formatMinutes(selectedCard.workedMinutes)}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[20px] bg-[color:var(--panel-muted)] p-4">
                        <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          <LogIn className="h-3.5 w-3.5" />
                          {runtimeLocalize("Приход", "Check-in", locale)}
                        </div>
                        <div className="text-base font-semibold text-[color:var(--foreground)]">
                          {formatTime(selectedCard.arrival)}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-[color:var(--panel-muted)] p-4">
                        <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                          <LogOut className="h-3.5 w-3.5" />
                          {runtimeLocalize("Уход", "Check-out", locale)}
                        </div>
                        <div className="text-base font-semibold text-[color:var(--foreground)]">
                          {formatTime(selectedCard.departure)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[color:var(--panel-muted)] p-4">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                        {runtimeLocalize("Смена и статус", "Shift and status", locale)}
                      </div>
                      <div className="text-sm font-semibold text-[color:var(--foreground)]">
                        {selectedCard.schedule}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            statusBadgeClass[selectedCard.status],
                          )}
                        >
                          {selectedCard.statusLabel}
                        </span>
                        {selectedCard.lateMinutes > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-[color:var(--soft-warning)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--warning)]">
                            {locale === "ru"
                              ? `Опоздание ${selectedCard.lateMinutes} мин`
                              : `${selectedCard.lateMinutes} min late`}
                          </span>
                        ) : null}
                        {selectedCard.earlyLeaveMinutes > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-[color:var(--soft-danger)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--danger)]">
                            {locale === "ru"
                              ? `Ранний уход ${selectedCard.earlyLeaveMinutes} мин`
                              : `${selectedCard.earlyLeaveMinutes} min early`}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {selectedCard.anomalies.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Аномалии", "Anomalies", locale)}
                        </div>
                        {selectedCard.anomalies.slice(0, 3).map((item) => (
                          <div
                            className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4"
                            key={item.anomalyId}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 rounded-xl p-2",
                                  item.severity === "critical"
                                    ? "bg-[color:var(--soft-danger)] text-[color:var(--danger)]"
                                    : "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
                                )}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                  {item.summary}
                                </p>
                                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                  {item.details}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                  </div>
                </aside>
              ) : null}
            </div>

            <section className="dashboard-card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-[color:var(--foreground)]">
                    {runtimeLocalize("Журнал отметок и проверок", "Attendance and verification log", locale)}
                  </h3>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {runtimeLocalize(
                      "Последние события прихода, ухода и перерывов с устройством, расстоянием и biometric status.",
                      "Latest check-in, check-out and break events with device, distance and biometric status.",
                      locale,
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[color:var(--muted-foreground)]">
                  <span>{runtimeLocalize("Всего:", "Total:", locale)} {audit?.totals.total ?? 0}</span>
                  <span>{runtimeLocalize("Подтверждено:", "Accepted:", locale)} {audit?.totals.accepted ?? 0}</span>
                  <span>{runtimeLocalize("Отклонено:", "Rejected:", locale)} {audit?.totals.rejected ?? 0}</span>
                  <span>{runtimeLocalize("Требуют внимания:", "Need attention:", locale)} {audit?.totals.reviewRequired ?? 0}</span>
                </div>
              </div>

              {!audit?.items.length ? (
                <div className="px-1 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                  {runtimeLocalize("Нет событий за выбранный период.", "No events for the selected period.", locale)}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-3">
                    {audit.items.map((item) => {
                      const isSelected = item.eventId === selectedAuditEventId;
                      const reviewNeeded =
                        item.biometricVerification?.result === "REVIEW" ||
                        item.biometricVerification?.manualReviewStatus === "PENDING";

                      return (
                        <button
                          className={cn(
                            "w-full rounded-[22px] border bg-white px-5 py-4 text-left transition",
                            isSelected
                              ? "border-[color:var(--accent)] shadow-[0_18px_36px_rgba(49,84,255,0.12)]"
                              : "border-[color:var(--border)] hover:border-[rgba(49,84,255,0.2)]",
                          )}
                          key={item.eventId}
                          onClick={() => setSelectedAuditEventId(item.eventId)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[color:var(--foreground)]">
                                  {item.employeeName}
                                </span>
                                <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--muted-foreground)]">
                                  {formatAuditEventType(item.eventType)}
                                </span>
                                <span className="rounded-full bg-[rgba(49,84,255,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent)]">
                                  {formatAuditSource(item.source)}
                                </span>
                                {reviewNeeded ? (
                                  <span className="rounded-full bg-[color:var(--soft-warning)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--warning)]">
                                    {runtimeLocalize(
                                      "Требует review",
                                      "Needs review",
                                      locale,
                                    )}
                                  </span>
                                ) : null}
                                {item.result === "REJECTED" ? (
                                  <span className="rounded-full bg-[color:var(--soft-danger)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--danger)]">
                                    {runtimeLocalize(
                                      "Отклонено",
                                      "Rejected",
                                      locale,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-[color:var(--muted-foreground)]">
                                {item.department} • {item.location.name} •{" "}
                                {new Date(item.occurredAt).toLocaleString(getRuntimeLocaleTag(locale), {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="text-right text-xs text-[color:var(--muted-foreground)]">
                              <div>
                                {runtimeLocalize("Дистанция", "Distance", locale)}:{" "}
                                {formatDistance(item.distanceMeters)}
                              </div>
                              <div>
                                {runtimeLocalize("Точность", "Accuracy", locale)}:{" "}
                                {formatDistance(item.accuracyMeters)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-[color:var(--muted-foreground)] md:grid-cols-3">
                            <div>
                              <span className="font-medium text-[color:var(--foreground)]">
                                {runtimeLocalize("Устройство", "Device", locale)}:
                              </span>{" "}
                              {item.device.name ||
                                item.device.platform ||
                                runtimeLocalize(
                                  "Неизвестное устройство",
                                  "Unknown device",
                                  locale,
                                )}
                            </div>
                            <div>
                              <span className="font-medium text-[color:var(--foreground)]">
                                {runtimeLocalize("Основное устройство", "Primary", locale)}:
                              </span>{" "}
                              {item.device.isPrimary === null
                                ? runtimeLocalize("Неизвестно", "Unknown", locale)
                                : item.device.isPrimary
                                  ? runtimeLocalize("Да", "Yes", locale)
                                  : runtimeLocalize("Нет", "No", locale)}
                            </div>
                            <div>
                              <span className="font-medium text-[color:var(--foreground)]">
                                {runtimeLocalize("Биометрия", "Biometric", locale)}:
                              </span>{" "}
                              {item.biometricVerification
                                ? formatBiometricResult(item.biometricVerification.result)
                                : runtimeLocalize("Нет данных", "No data", locale)}
                            </div>
                          </div>
                          {item.failureReason ? (
                            <div className="mt-3 rounded-[16px] bg-[color:var(--panel-muted)] px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                              <span className="font-medium text-[color:var(--foreground)]">
                                {runtimeLocalize("Причина", "Reason", locale)}:
                              </span>{" "}
                              {formatFailureReason(item.failureReason)}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAuditItem ? (
                    <div className="space-y-4 xl:sticky xl:top-6">
                      <AttendanceAuditMap
                        apiKey={mapsApiKey}
                        eventLabel={`${selectedAuditItem.employeeName} · ${formatAuditEventType(selectedAuditItem.eventType)}`}
                        eventLatitude={selectedAuditItem.latitude}
                        eventLongitude={selectedAuditItem.longitude}
                        geofenceRadiusMeters={selectedAuditItem.location.geofenceRadiusMeters}
                        locationLabel={selectedAuditItem.location.name}
                        locationLatitude={selectedAuditItem.location.latitude}
                        locationLongitude={selectedAuditItem.location.longitude}
                      />

                      <div className="rounded-[24px] border border-[color:var(--border)] bg-white p-5">
                        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Детали события", "Event details", locale)}
                        </div>
                        <div className="grid gap-3 text-sm text-[color:var(--muted-foreground)]">
                          <div>
                            <strong className="text-[color:var(--foreground)]">
                              {runtimeLocalize("Рабочая точка", "Work location", locale)}:
                            </strong>{" "}
                            {selectedAuditItem.location.address}
                          </div>
                          <div>
                            <strong className="text-[color:var(--foreground)]">
                              {runtimeLocalize(
                                "Координаты события",
                                "Event coordinates",
                                locale,
                              )}
                              :
                            </strong>{" "}
                            {selectedAuditItem.latitude.toFixed(6)}, {selectedAuditItem.longitude.toFixed(6)}
                          </div>
                          <div>
                            <strong className="text-[color:var(--foreground)]">
                              {runtimeLocalize("Радиус геозоны", "Geofence radius", locale)}:
                            </strong>{" "}
                            {selectedAuditItem.location.geofenceRadiusMeters}
                            {locale === "ru" ? " м" : " m"}
                          </div>
                          <div>
                            <strong className="text-[color:var(--foreground)]">
                              {runtimeLocalize("Источник", "Source", locale)}:
                            </strong>{" "}
                            {formatAuditSource(selectedAuditItem.source)}
                          </div>
                          <div>
                            <strong className="text-[color:var(--foreground)]">
                              {runtimeLocalize("Устройство", "Device", locale)}:
                            </strong>{" "}
                            {selectedAuditItem.device.name ||
                              selectedAuditItem.device.platform ||
                              runtimeLocalize("Неизвестное устройство", "Unknown device", locale)}
                          </div>
                          <div>
                            <strong className="text-[color:var(--foreground)]">Primary:</strong>{" "}
                            {selectedAuditItem.device.isPrimary === null
                              ? runtimeLocalize("Неизвестно", "Unknown", locale)
                              : selectedAuditItem.device.isPrimary
                                ? runtimeLocalize("Да", "Yes", locale)
                                : runtimeLocalize("Нет", "No", locale)}
                          </div>
                          {selectedAuditItem.failureReason ? (
                            <div>
                              <strong className="text-[color:var(--foreground)]">
                                {runtimeLocalize("Причина отказа", "Failure reason", locale)}:
                              </strong>{" "}
                              {formatFailureReason(selectedAuditItem.failureReason)}
                            </div>
                          ) : null}
                          {selectedAuditItem.notes ? (
                            <div>
                              <strong className="text-[color:var(--foreground)]">
                                {runtimeLocalize("Комментарий", "Comment", locale)}:
                              </strong>{" "}
                              {selectedAuditItem.notes}
                            </div>
                          ) : null}
                          {selectedAuditItem.biometricVerification ? (
                            <div className="rounded-[18px] bg-[color:var(--panel-muted)] p-4">
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                                {runtimeLocalize(
                                  "Проверка биометрии",
                                  "Biometric verification",
                                  locale,
                                )}
                              </div>
                              <div className="grid gap-2 text-sm">
                                <div>
                                  <strong className="text-[color:var(--foreground)]">
                                    {runtimeLocalize("Статус", "Status", locale)}:
                                  </strong>{" "}
                                  {formatBiometricResult(selectedAuditItem.biometricVerification.result)}
                                </div>
                                <div>
                                  <strong className="text-[color:var(--foreground)]">
                                    {runtimeLocalize("Совпадение", "Match score", locale)}:
                                  </strong>{" "}
                                  {selectedAuditItem.biometricVerification.matchScore ?? "—"}
                                </div>
                                <div>
                                  <strong className="text-[color:var(--foreground)]">
                                    {runtimeLocalize("Живость", "Liveness", locale)}:
                                  </strong>{" "}
                                  {selectedAuditItem.biometricVerification.livenessScore ?? "—"}
                                </div>
                                {selectedAuditItem.biometricVerification.reviewReason ? (
                                  <div>
                                    <strong className="text-[color:var(--foreground)]">
                                      {runtimeLocalize(
                                        "Причина отказа",
                                        "Failure reason",
                                        locale,
                                      )}
                                      :
                                    </strong>{" "}
                                    {selectedAuditItem.biometricVerification.reviewReason}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex w-fit flex-wrap items-center overflow-hidden rounded-xl border border-border">
                {periodPresets.map((option) => (
                  <button
                    className={cn(
                      "px-4 py-2 text-sm font-heading font-medium transition-colors",
                      preset === option.key
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    key={option.key}
                    onClick={() => handlePresetChange(option.key)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {preset === "custom" ? (
                <div className="min-w-[260px] max-w-full">
                  <DateRangePicker
                    aria-label={runtimeLocalize("Период дат", "Date range", locale)}
                    buttonClassName="justify-start whitespace-nowrap"
                    onChange={(value) => {
                      if (!value?.start || !value?.end) {
                        return;
                      }

                      setRangeFrom(
                        value.start.toDate(getLocalTimeZone()) <=
                          value.end.toDate(getLocalTimeZone())
                          ? formatDateKey(value.start.toDate(getLocalTimeZone()))
                          : formatDateKey(value.end.toDate(getLocalTimeZone())),
                      );
                      setRangeTo(
                        value.start.toDate(getLocalTimeZone()) <=
                          value.end.toDate(getLocalTimeZone())
                          ? formatDateKey(value.end.toDate(getLocalTimeZone()))
                          : formatDateKey(value.start.toDate(getLocalTimeZone())),
                      );
                    }}
                    placeholder={runtimeLocalize("Выберите даты", "Select dates", locale)}
                    size="md"
                    value={parseCalendarDateRangeInput(rangeFrom, rangeTo)}
                  />
                </div>
              ) : null}
            </div>

            <div className="dashboard-card space-y-4">
              <div>
                <div>
                  <h3 className="text-xl font-semibold text-[color:var(--foreground)]">
                    {runtimeLocalize("Сводка по сотрудникам", "Employee summary", locale)}
                  </h3>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {formatHumanRange(activeDateFrom, activeDateTo)}
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                <Input
                  className="pl-10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={runtimeLocalize(
                    "Поиск сотрудника...",
                    "Search employee...",
                    locale,
                  )}
                  value={search}
                />
              </div>

              {error ? (
                <div className="rounded-[22px] border border-[color:var(--soft-danger)] bg-[color:var(--panel-muted)] px-5 py-6 text-sm text-[color:var(--danger)]">
                  {error}
                </div>
              ) : null}

              <Table
                aria-label={runtimeLocalize(
                  "Сводка по сотрудникам",
                  "Employee summary",
                  locale,
                )}
                onSortChange={setPeriodSortDescriptor}
                size="sm"
                sortDescriptor={periodSortDescriptor}
              >
                <Table.Header>
                  <Table.Head
                    allowsSorting
                    className="w-[34%] min-w-[280px]"
                    id="employeeName"
                    isRowHeader
                    label={`${runtimeLocalize("Сотрудники", "Employees", locale)} ${sortedPeriodRows.length}`}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[9%] min-w-[88px] text-center"
                    id="total"
                    label={runtimeLocalize("Смен", "Shifts", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[10%] min-w-[92px] text-center"
                    id="ontime"
                    label={runtimeLocalize("Вовремя", "On time", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[10%] min-w-[104px] text-center"
                    id="late"
                    label={runtimeLocalize("Опоздания", "Late", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[10%] min-w-[116px] text-center"
                    id="earlyLeave"
                    label={runtimeLocalize("Ранний уход", "Early leave", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[9%] min-w-[96px] text-center"
                    id="missed"
                    label={runtimeLocalize("Пропуски", "Missed", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[8%] min-w-[94px] text-center"
                    id="workedMinutes"
                    label={runtimeLocalize("Часы", "Hours", locale)}
                  />
                  <Table.Head
                    allowsSorting
                    className="w-[10%] min-w-[126px] text-center"
                    id="attendanceRate"
                    label={runtimeLocalize("Посещаемость", "Attendance", locale)}
                  />
                </Table.Header>

                <Table.Body items={sortedPeriodRows}>
                  {(row) => (
                    <Table.Row className="animate-fade-in" id={row.id}>
                      <Table.Cell className="align-middle">
                        <div className="flex items-center gap-3">
                          <AttendanceAvatar name={row.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-primary">
                              {row.name}
                            </div>
                            <div className="truncate text-sm text-tertiary">
                              {row.position} • {row.employeeNumber}
                            </div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center font-semibold text-primary">
                        {row.total}
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center">
                        <span className="font-semibold text-[color:var(--success)]">
                          {row.ontime}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center">
                        <span className="font-semibold text-[color:var(--warning)]">
                          {row.late}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center">
                        <span className="font-semibold text-[color:var(--danger)]">
                          {row.earlyLeave}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center">
                        <span className="font-semibold text-[color:var(--accent-strong)]">
                          {row.missed}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="align-middle text-center text-primary">
                        {formatMinutes(row.workedMinutes)}
                      </Table.Cell>
                      <Table.Cell className="align-middle">
                        <div className="mx-auto flex max-w-[110px] flex-col items-center gap-1">
                          <span className="text-sm font-semibold text-primary">
                            {row.attendanceRate}%
                          </span>
                          <ProgressBar
                            className="h-1.5 w-full"
                            tone={getProgressTone(row.attendanceRate)}
                            value={row.attendanceRate}
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>

              {!isLoading && !error && periodRows.length === 0 ? (
                <div className="px-1 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                  {runtimeLocalize(
                    "За выбранный период данных не найдено.",
                    "No data found for the selected period.",
                    locale,
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
