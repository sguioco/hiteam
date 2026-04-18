"use client";

import { getLocalTimeZone, parseDate } from "@internationalized/date";
import {
  AttendanceHistoryResponse,
  AttendanceLiveSession,
  CollaborationTaskBoardResponse,
  TaskItem,
  TaskPriority,
  TaskStatus,
  WorkGroupItem,
} from "@smart/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  Circle,
  CircleX,
  ExternalLink,
  Filter,
  Search,
  UsersRound,
} from "lucide-react";
import type { SortDescriptor } from "react-aria-components";
import { AdminShell } from "@/components/admin-shell";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AppSelectField } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { getSession, hasManagerAccess } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { useI18n } from "@/lib/i18n";
import { parseTaskMeta } from "@/lib/task-meta";
import { localizePersonName } from "@/lib/transliteration";
import { useTranslatedTaskCopy } from "@/lib/use-translated-task-copy";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

export type EmployeeDirectoryItem = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatarUrl?: string | null;
  biometricProfile?: {
    enrollmentStatus: "NOT_STARTED" | "PENDING" | "ENROLLED" | "FAILED";
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  primaryLocation?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    name: string;
  } | null;
};

type DatePreset = "yesterday" | "today" | "tomorrow" | "custom";

type EmployeeTaskStats = {
  total: number;
  done: number;
  open: number;
  overdue: number;
  photoPending: number;
  nextDueAt: string | null;
};

type EmployeeTaskEntry = {
  employee: EmployeeDirectoryItem;
  tasks: TaskItem[];
  stats: EmployeeTaskStats;
};

type AttendanceHistoryRow = AttendanceHistoryResponse["rows"][number];

type TaskTableRow = {
  id: string;
  employeeName: string;
  employeeSubtitle: string | null;
  employeeInitials: string;
  employeeAvatarUrl: string | null;
  statusLabel: string;
  statusActive: boolean;
  statusTone: "success" | "gray" | "error";
  statusSort: number;
  teams: string[];
  teamsSort: string;
  tasksSort: number;
  tasksProgressLabel: string;
  isComplete: boolean;
  entry: EmployeeTaskEntry;
};

type TaskSortColumn = "employeeName" | "status" | "teams" | "tasks";

type TaskRenderRow =
  | (TaskTableRow & {
      kind: "summary";
      renderKey: string;
    })
  | {
      kind: "details";
      renderKey: string;
      row: TaskTableRow;
    }
  | {
      kind: "empty";
      renderKey: string;
    };

function localize(locale: string, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, boundary: "start" | "end") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return boundary === "start" ? startOfDay(parsed) : endOfDay(parsed);
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

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0",
  )}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function getEmployeeName(
  employee: Pick<EmployeeDirectoryItem, "firstName" | "lastName">,
  locale: string,
) {
  if (locale === "ru") {
    return `${employee.lastName} ${employee.firstName}`.trim();
  }

  return localizePersonName(
    `${employee.firstName} ${employee.lastName}`.trim(),
    "en",
  );
}

function isMeetingTask(
  task: TaskItem,
  taskMeta?: ReturnType<typeof parseTaskMeta>,
) {
  return Boolean(taskMeta?.meeting) || /^(встреча|meeting):/i.test(task.title);
}

function getTaskAnchorDate(task: TaskItem) {
  const candidates = [task.dueAt, task.occurrenceDate, task.createdAt];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function getScheduledTaskDate(task: TaskItem) {
  const candidates = [task.dueAt, task.occurrenceDate];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function isTaskOpen(status: TaskStatus) {
  return status !== "DONE" && status !== "CANCELLED";
}

function isTaskOverdue(task: TaskItem, referenceDate: Date) {
  if (!isTaskOpen(task.status)) {
    return false;
  }

  const dueAt = getScheduledTaskDate(task);
  if (!dueAt) {
    return false;
  }

  return endOfDay(dueAt).getTime() < startOfDay(referenceDate).getTime();
}

function getActivePhotoProofs(task: TaskItem) {
  return task.photoProofs.filter(
    (proof) => !proof.deletedAt && !proof.supersededByProofId,
  );
}

function formatDateLabel(value: string | Date | null | undefined, locale: string) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const formatted = parsed.toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  if (locale === "ru") {
    return formatted.replace(/\s*г\.?$/i, "");
  }

  return formatted;
}

function formatResolvedRangeLabel(start: Date, end: Date, locale: string) {
  if (formatDateKey(start) === formatDateKey(end)) {
    return formatDateLabel(start, locale);
  }

  return `${formatDateLabel(start, locale)} - ${formatDateLabel(end, locale)}`;
}

function formatHeadlineDateParts(value: Date, locale: string) {
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  return {
    weekday: value.toLocaleDateString(dateLocale, {
      weekday: "long",
    }),
    primary: value.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
    }),
    year: value.toLocaleDateString(dateLocale, {
      year: "numeric",
    }),
  };
}

function formatHeadlineDateWithoutYear(value: Date, locale: string) {
  return formatHeadlineDateParts(value, locale).primary;
}

function formatResolvedRangeHeading(
  start: Date,
  end: Date,
  locale: string,
  preset: DatePreset,
) {
  if (formatDateKey(start) === formatDateKey(end)) {
    const parts = formatHeadlineDateParts(start, locale);

    return {
      weekday: preset === "custom" ? null : parts.weekday,
      primary: parts.primary,
      year: null,
      separateYear: false,
    };
  }

  return {
    weekday: null,
    primary: `${formatHeadlineDateWithoutYear(start, locale)} - ${formatHeadlineDateWithoutYear(end, locale)}`,
    year: null,
    separateYear: false,
  };
}

function formatTimeOfDay(value: string | null | undefined, locale: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getInclusiveDayCount(start: Date, end: Date) {
  const startValue = startOfDay(start).getTime();
  const endValue = startOfDay(end).getTime();
  return Math.max(1, Math.round((endValue - startValue) / 86_400_000) + 1);
}

function buildHistoricalStatusSummary(
  rows: AttendanceHistoryRow[],
  rangeStart: Date,
  rangeEnd: Date,
  locale: string,
): Pick<TaskTableRow, "statusLabel" | "statusActive" | "statusTone" | "statusSort"> {
  if (!rows.length) {
    return {
      statusLabel: localize(locale, "Отсутствовал", "Absent"),
      statusActive: false,
      statusTone: "gray",
      statusSort: 2,
    };
  }

  const sortedRows = rows
    .slice()
    .sort(
      (left, right) =>
        new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
    );
  const firstRow = sortedRows[0];
  const lastCompletedRow = [...sortedRows]
    .reverse()
    .find((row) => row.endedAt || row.checkOutEvent?.occurredAt);
  const hasLate = sortedRows.some((row) => row.lateMinutes > 0);
  const hasEarlyLeave = sortedRows.some((row) => row.earlyLeaveMinutes > 0);
  const timeRangeLabel = `${formatTimeOfDay(firstRow?.startedAt ?? null, locale)}-${formatTimeOfDay(
    lastCompletedRow?.endedAt ??
      lastCompletedRow?.checkOutEvent?.occurredAt ??
      firstRow?.startedAt ??
      null,
    locale,
  )}`;

  if (formatDateKey(rangeStart) === formatDateKey(rangeEnd)) {
    return {
      statusLabel: timeRangeLabel,
      statusActive: true,
      statusTone: hasLate || hasEarlyLeave ? "error" : "success",
      statusSort: hasLate ? -2 : hasEarlyLeave ? -1 : 0,
    };
  }

  const presentDays = sortedRows.reduce((days, row) => {
    const startedAt = new Date(row.startedAt);
    if (!Number.isNaN(startedAt.getTime())) {
      days.add(formatDateKey(startedAt));
    }
    return days;
  }, new Set<string>()).size;
  const totalDays = getInclusiveDayCount(rangeStart, rangeEnd);
  const rangeLabel =
    locale === "ru"
      ? `${presentDays}/${totalDays} дн.`
      : `${presentDays}/${totalDays} days`;

  return {
    statusLabel:
      presentDays === 1 ? `${rangeLabel} • ${timeRangeLabel}` : rangeLabel,
    statusActive: true,
    statusTone: hasLate || hasEarlyLeave ? "error" : "success",
    statusSort: hasLate ? -2 : hasEarlyLeave ? -1 : 0,
  };
}

function priorityLabel(priority: TaskPriority, _locale: string) {
  switch (priority) {
    case "LOW":
      return "EASY";
    case "MEDIUM":
      return "MEDIUM";
    case "HIGH":
    case "URGENT":
      return "HARD";
    default:
      return "MEDIUM";
  }
}

function priorityTone(priority: TaskPriority): "easy" | "medium" | "hard" {
  switch (priority) {
    case "LOW":
      return "easy";
    case "MEDIUM":
      return "medium";
    case "HIGH":
    case "URGENT":
      return "hard";
    default:
      return "medium";
  }
}

function compareTasksForDisplay(left: TaskItem, right: TaskItem) {
  const leftClosed = !isTaskOpen(left.status);
  const rightClosed = !isTaskOpen(right.status);

  if (leftClosed !== rightClosed) {
    return leftClosed ? 1 : -1;
  }

  const leftTime = getTaskAnchorDate(left)?.getTime() ?? 0;
  const rightTime = getTaskAnchorDate(right)?.getTime() ?? 0;

  return leftTime - rightTime;
}

function getCompletionRatio(stats: EmployeeTaskStats) {
  if (stats.total <= 0) {
    return -1;
  }

  return stats.done / stats.total;
}

function getTaskAttentionRank(stats: EmployeeTaskStats) {
  if (stats.total <= 0) {
    return 3;
  }

  if (stats.done >= stats.total) {
    return 2;
  }

  return getCompletionRatio(stats);
}

function getEmployeeInitials(employee: Pick<EmployeeDirectoryItem, "firstName" | "lastName">) {
  return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.trim().toUpperCase();
}

function getEmployeeSubtitle(
  employee: Pick<EmployeeDirectoryItem, "department" | "position" | "primaryLocation">,
) {
  return employee.position?.name ?? employee.department?.name ?? employee.primaryLocation?.name ?? null;
}

function hasCompletedEmployeeRegistration(
  employee: Pick<EmployeeDirectoryItem, "biometricProfile">,
) {
  return employee.biometricProfile?.enrollmentStatus === "ENROLLED";
}

const TASKS_CACHE_TTL_MS = 60_000;

type ManagerTasksCachePayload = {
  tasks: TaskItem[];
  employees: EmployeeDirectoryItem[];
  groups: WorkGroupItem[];
  liveSessions: AttendanceLiveSession[];
};

export type ManagerTasksPageInitialData = ManagerTasksCachePayload;

function buildManagerTasksCacheKey(session: ReturnType<typeof getSession>) {
  return session ? `manager-tasks:${session.user.id}` : null;
}

export function ManagerTasksPage({
  initialData,
}: {
  initialData?: ManagerTasksPageInitialData | null;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const session = getSession();
  const accessToken = session?.accessToken ?? null;
  const tasksCacheKey = useMemo(
    () => buildManagerTasksCacheKey(session),
    [session],
  );
  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>(initialData?.tasks ?? []);
  const { getTaskTitle } = useTranslatedTaskCopy(tasks, locale);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>(
    initialData?.employees ?? [],
  );
  const [groups, setGroups] = useState<WorkGroupItem[]>(initialData?.groups ?? []);
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(
    initialData?.liveSessions ?? [],
  );
  const [attendanceHistory, setAttendanceHistory] =
    useState<AttendanceHistoryResponse | null>(null);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [attendanceHistoryError, setAttendanceHistoryError] = useState<string | null>(
    null,
  );
  const [preset, setPreset] = useState<DatePreset>("today");
  const [dateFrom, setDateFrom] = useState(() => formatDateInput(new Date()));
  const [dateTo, setDateTo] = useState(() => formatDateInput(new Date()));
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<string[]>([]);
  const [photoProofDialogTask, setPhotoProofDialogTask] = useState<{
    title: string;
    proofs: { id: string; url: string }[];
  } | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [taskPresenceFilter, setTaskPresenceFilter] = useState("all");
  const [taskCountFilter, setTaskCountFilter] = useState("0");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "tasks",
    direction: "ascending",
  });
  const didUseInitialData = useRef(Boolean(initialData));

  function applyCachedSnapshot(snapshot: ManagerTasksCachePayload) {
    setTasks(snapshot.tasks);
    setEmployees(snapshot.employees);
    setGroups(snapshot.groups);
    setLiveSessions(snapshot.liveSessions);
  }

  async function loadTasksSnapshot(options?: {
    force?: boolean;
    silent?: boolean;
  }) {
    if (!session) {
      if (!options?.silent) {
        setLoading(false);
      }
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const snapshot = await apiRequest<ManagerTasksCachePayload>("/bootstrap/tasks", {
        token: session.accessToken,
        skipClientCache: options?.force ?? false,
      });
      setError(null);
      applyCachedSnapshot(snapshot);
    } catch (loadError) {
      if (options?.silent) {
        return;
      }

      setTasks([]);
      setEmployees([]);
      setGroups([]);
      setLiveSessions([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : localize(
              locale,
              "Не удалось загрузить задачи команды.",
              "Unable to load team tasks.",
            ),
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const session = getSession();

    if (!session) {
      setAccessChecked(true);
      return;
    }

    if (!hasManagerAccess(session.user.roleCodes)) {
      router.replace(toAdminHref("/"));
      return;
    }

    setAccessChecked(true);
  }, [router]);

  useEffect(() => {
    if (!accessChecked) {
      return;
    }

    if (!session) {
      return;
    }

    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cached = tasksCacheKey
      ? readClientCache<ManagerTasksCachePayload>(
          tasksCacheKey,
          TASKS_CACHE_TTL_MS,
        )
      : null;

    if (cached) {
      applyCachedSnapshot(cached.value);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void loadTasksSnapshot({
      force: true,
      silent: Boolean(cached),
    }).finally(() => {
      if (cancelled) {
        return;
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accessChecked, initialData, locale, tasksCacheKey]);

  useWorkspaceAutoRefresh({
    session,
    enabled: accessChecked && Boolean(session),
    onRefresh: async () => {
      await loadTasksSnapshot({
        force: true,
        silent: true,
      });
    },
  });

  useEffect(() => {
    if (!tasksCacheKey || loading) {
      return;
    }

    writeClientCache(tasksCacheKey, {
      tasks,
      employees,
      groups,
      liveSessions,
    } satisfies ManagerTasksCachePayload);
  }, [employees, groups, liveSessions, loading, tasks, tasksCacheKey]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    let start = parseDateInput(dateFrom, "start") ?? startOfDay(today);
    let end = parseDateInput(dateTo, "end") ?? endOfDay(today);

    if (start.getTime() > end.getTime()) {
      const nextStart = startOfDay(end);
      const nextEnd = endOfDay(start);
      return { rangeStart: nextStart, rangeEnd: nextEnd };
    }

    return { rangeStart: start, rangeEnd: end };
  }, [dateFrom, dateTo, today]);
  const resolvedDateFrom = useMemo(() => formatDateInput(rangeStart), [rangeStart]);
  const resolvedDateTo = useMemo(() => formatDateInput(rangeEnd), [rangeEnd]);
  const isHistoricalRange = useMemo(
    () => rangeEnd.getTime() < today.getTime(),
    [rangeEnd, today],
  );

  useEffect(() => {
    if (!accessChecked) {
      return;
    }

    if (!accessToken) {
      setAttendanceHistory(null);
      setAttendanceHistoryLoading(false);
      setAttendanceHistoryError(null);
      return;
    }

    if (!isHistoricalRange) {
      setAttendanceHistory(null);
      setAttendanceHistoryLoading(false);
      setAttendanceHistoryError(null);
      return;
    }

    let cancelled = false;
    setAttendanceHistory(null);
    setAttendanceHistoryLoading(true);
    setAttendanceHistoryError(null);

    const query = new URLSearchParams({
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
    }).toString();

    void apiRequest<AttendanceHistoryResponse>(`/attendance/team/history?${query}`, {
      token: accessToken,
    })
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setAttendanceHistory(snapshot);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setAttendanceHistory(null);
        setAttendanceHistoryError(
          loadError instanceof Error
            ? loadError.message
            : localize(
                locale,
                "Не удалось загрузить итоги посещаемости.",
                "Unable to load attendance summary.",
              ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setAttendanceHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessChecked,
    accessToken,
    isHistoricalRange,
    locale,
    resolvedDateFrom,
    resolvedDateTo,
  ]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const anchorDate = getTaskAnchorDate(task);
      if (!anchorDate) {
        return false;
      }

      return (
        anchorDate.getTime() >= rangeStart.getTime() &&
        anchorDate.getTime() <= rangeEnd.getTime()
      );
    });
  }, [rangeEnd, rangeStart, tasks]);

  const employeeTaskEntries = useMemo<EmployeeTaskEntry[]>(() => {
    const tasksByEmployee = new Map<string, TaskItem[]>();

    for (const task of visibleTasks) {
      if (!task.assigneeEmployeeId) continue;
      const current = tasksByEmployee.get(task.assigneeEmployeeId) ?? [];
      current.push(task);
      tasksByEmployee.set(task.assigneeEmployeeId, current);
    }

    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    for (const task of visibleTasks) {
      if (
        !task.assigneeEmployee ||
        employeeMap.has(task.assigneeEmployee.id)
      ) {
        continue;
      }

      employeeMap.set(task.assigneeEmployee.id, {
        id: task.assigneeEmployee.id,
        firstName: task.assigneeEmployee.firstName,
        lastName: task.assigneeEmployee.lastName,
        employeeNumber: task.assigneeEmployee.employeeNumber,
        avatarUrl: null,
        department: task.assigneeEmployee.department ?? null,
        primaryLocation: task.assigneeEmployee.primaryLocation ?? null,
        position: null,
      });
    }

    return Array.from(employeeMap.values())
      .map((employee) => {
        const employeeTasks = (tasksByEmployee.get(employee.id) ?? [])
          .slice()
          .sort(compareTasksForDisplay);

        const stats = employeeTasks.reduce<EmployeeTaskStats>(
          (current, task) => {
            const scheduledAt = getScheduledTaskDate(task);

            current.total += 1;

            if (task.status === "DONE") {
              current.done += 1;
            }

            if (isTaskOpen(task.status)) {
              current.open += 1;
            }

            if (isTaskOverdue(task, today)) {
              current.overdue += 1;
            }

            if (
              task.requiresPhoto &&
              isTaskOpen(task.status) &&
              getActivePhotoProofs(task).length === 0
            ) {
              current.photoPending += 1;
            }

            if (
              scheduledAt &&
              (!current.nextDueAt ||
                scheduledAt.getTime() <
                  new Date(current.nextDueAt).getTime())
            ) {
              current.nextDueAt = scheduledAt.toISOString();
            }

            return current;
          },
          {
            total: 0,
            done: 0,
            open: 0,
            overdue: 0,
            photoPending: 0,
            nextDueAt: null,
          },
        );

        return {
          employee,
          tasks: employeeTasks,
          stats,
        };
      });
  }, [employees, today, visibleTasks]);

  const teamsByEmployeeId = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const group of groups) {
      for (const membership of group.memberships) {
        const current = map.get(membership.employeeId) ?? [];
        current.push(group.name);
        map.set(membership.employeeId, current);
      }
    }

    for (const [employeeId, teamNames] of map.entries()) {
      map.set(employeeId, Array.from(new Set(teamNames)).sort((left, right) => left.localeCompare(right)));
    }

    return map;
  }, [groups]);

  const liveSessionsByEmployeeId = useMemo(() => {
    return new Map(liveSessions.map((session) => [session.employeeId, session]));
  }, [liveSessions]);

  const attendanceHistoryRowsByEmployeeId = useMemo(() => {
    const rowsByEmployee = new Map<string, AttendanceHistoryRow[]>();

    for (const row of attendanceHistory?.rows ?? []) {
      const rows = rowsByEmployee.get(row.employeeId) ?? [];
      rows.push(row);
      rowsByEmployee.set(row.employeeId, rows);
    }

    return rowsByEmployee;
  }, [attendanceHistory]);

  const tableRows = useMemo<TaskTableRow[]>(() => {
    return employeeTaskEntries.map((entry) => {
      const employeeName = getEmployeeName(entry.employee, locale);
      const teams = teamsByEmployeeId.get(entry.employee.id) ?? [];
      const liveSession = liveSessionsByEmployeeId.get(entry.employee.id);
      const historyRows =
        attendanceHistoryRowsByEmployeeId.get(entry.employee.id) ?? [];
      const isComplete =
        entry.stats.total > 0 && entry.stats.done >= entry.stats.total;
      const statusSummary: Pick<
        TaskTableRow,
        "statusLabel" | "statusActive" | "statusTone" | "statusSort"
      > = isHistoricalRange
        ? attendanceHistoryLoading && !attendanceHistory
          ? {
              statusLabel: localize(locale, "Загрузка...", "Loading..."),
              statusActive: false,
              statusTone: "gray",
              statusSort: 1,
            }
          : attendanceHistoryError && !attendanceHistory
            ? {
                statusLabel: localize(locale, "Нет данных", "No data"),
                statusActive: false,
                statusTone: "gray",
                statusSort: 1,
              }
            : buildHistoricalStatusSummary(
                historyRows,
                rangeStart,
                rangeEnd,
                locale,
              )
        : (() => {
            const isRegistered = hasCompletedEmployeeRegistration(entry.employee);
            const isCheckedIn =
              liveSession?.status === "on_shift" || liveSession?.status === "on_break";
            const isLate = Boolean(
              liveSession &&
                (liveSession.status === "on_shift" ||
                  liveSession.status === "on_break") &&
                liveSession.lateMinutes > 0,
            );

            return {
              statusLabel:
                !isRegistered
                  ? localize(locale, "Не зарегистрирован", "Not registered")
                  : isLate
                  ? localize(locale, "Опаздывает", "Late")
                  : isCheckedIn
                    ? localize(locale, "На смене", "On shift")
                    : localize(locale, "Не на смене", "Off shift"),
              statusActive: isRegistered ? isCheckedIn : false,
              statusTone: !isRegistered
                ? "gray"
                : isLate
                  ? "error"
                  : isCheckedIn
                    ? "success"
                    : "gray",
              statusSort: !isRegistered ? 2 : isLate ? -1 : isCheckedIn ? 0 : 1,
            };
          })();

      return {
        id: entry.employee.id,
        employeeName,
        employeeSubtitle: getEmployeeSubtitle(entry.employee),
        employeeInitials: getEmployeeInitials(entry.employee),
        employeeAvatarUrl: entry.employee.avatarUrl ?? null,
        ...statusSummary,
        teams,
        teamsSort: teams.join(" "),
        tasksSort: getTaskAttentionRank(entry.stats),
        tasksProgressLabel: `${entry.stats.done}/${entry.stats.total}`,
        isComplete,
        entry,
      };
    });
  }, [
    attendanceHistory,
    attendanceHistoryError,
    attendanceHistoryLoading,
    attendanceHistoryRowsByEmployeeId,
    employeeTaskEntries,
    isHistoricalRange,
    liveSessionsByEmployeeId,
    locale,
    rangeEnd,
    rangeStart,
    teamsByEmployeeId,
  ]);

  const statusFilterOptions = useMemo(
    () => [
      {
        value: "all",
        label: localize(locale, "Все статусы", "All statuses"),
      },
      {
        value: "on_shift",
        label: isHistoricalRange
          ? localize(locale, "Был на смене", "Present")
          : localize(locale, "На смене", "On shift"),
      },
      {
        value: "late",
        label: isHistoricalRange
          ? localize(locale, "Есть отклонения", "Has deviations")
          : localize(locale, "Опаздывает", "Late"),
      },
      {
        value: "off_shift",
        label: isHistoricalRange
          ? localize(locale, "Отсутствовал", "Absent")
          : localize(locale, "Не на смене", "Off shift"),
      },
    ],
    [isHistoricalRange, locale],
  );

  const groupOptions = useMemo(
    () =>
      groups
        .slice()
        .sort((left, right) =>
          left.name.localeCompare(right.name, locale === "ru" ? "ru" : "en"),
        )
        .map((group) => ({
          value: group.id,
          label: group.name,
        })),
    [groups, locale],
  );

  const filteredRows = useMemo(() => {
    const minTasks = Number(taskCountFilter) || 0;
    const searchQuery = employeeSearch.trim().toLowerCase();
    const selectedGroupName = groupFilter
      ? groups.find((group) => group.id === groupFilter)?.name ?? null
      : null;

    return tableRows.filter((row) => {
      if (
        searchQuery &&
        ![row.employeeName, row.employeeSubtitle ?? "", row.teams.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery)
      ) {
        return false;
      }

      if (selectedGroupName && !row.teams.includes(selectedGroupName)) {
        return false;
      }

      if (statusFilter === "on_shift" && !row.statusActive) {
        return false;
      }

      if (statusFilter === "late" && row.statusTone !== "error") {
        return false;
      }

      if (statusFilter === "off_shift" && row.statusActive) {
        return false;
      }

      if (taskPresenceFilter === "with_tasks" && row.entry.stats.total <= 0) {
        return false;
      }

      if (taskPresenceFilter === "without_tasks" && row.entry.stats.total > 0) {
        return false;
      }

      if (row.entry.stats.total < minTasks) {
        return false;
      }

      return true;
    });
  }, [
    employeeSearch,
    groupFilter,
    groups,
    statusFilter,
    tableRows,
    taskCountFilter,
    taskPresenceFilter,
  ]);

  const teamSummary = useMemo(() => {
    return filteredRows.reduce(
      (summary, row) => {
        summary.total += row.entry.stats.total;
        summary.completed += row.entry.stats.done;
        return summary;
      },
      { total: 0, completed: 0 },
    );
  }, [filteredRows]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(groupFilter) ||
      statusFilter !== "all" ||
      taskPresenceFilter !== "all" ||
      taskCountFilter !== "0",
    [groupFilter, statusFilter, taskPresenceFilter, taskCountFilter],
  );

  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(groupFilter)) +
      Number(statusFilter !== "all") +
      Number(taskPresenceFilter !== "all") +
      Number(taskCountFilter !== "0"),
    [groupFilter, statusFilter, taskPresenceFilter, taskCountFilter],
  );

  const sortedRows = useMemo(() => {
    const items = [...filteredRows];
    const column = (sortDescriptor.column as TaskSortColumn | undefined) ?? "tasks";
    const directionMultiplier = sortDescriptor.direction === "descending" ? -1 : 1;

    items.sort((left, right) => {
      let comparison = 0;

      if (column === "employeeName") {
        comparison = left.employeeName.localeCompare(
          right.employeeName,
          locale === "ru" ? "ru" : "en",
        );
      } else if (column === "status") {
        comparison = left.statusSort - right.statusSort;
      } else if (column === "teams") {
        comparison = left.teamsSort.localeCompare(right.teamsSort, locale === "ru" ? "ru" : "en");
      } else if (column === "tasks") {
        comparison = left.tasksSort - right.tasksSort;
        if (comparison === 0) {
          comparison = right.entry.stats.total - left.entry.stats.total;
        }
      }

      if (comparison === 0) {
        comparison = left.employeeName.localeCompare(
          right.employeeName,
          locale === "ru" ? "ru" : "en",
        );
      }

      return comparison * directionMultiplier;
    });

    return items;
  }, [filteredRows, locale, sortDescriptor]);

  const renderRows = useMemo<TaskRenderRow[]>(
    () =>
      sortedRows.length
        ? sortedRows.flatMap((row) => {
        const items: TaskRenderRow[] = [
          {
            ...row,
            kind: "summary",
            renderKey: `${row.id}:summary`,
          },
        ];

        if (expandedEmployeeIds.includes(row.id)) {
          items.push({
            kind: "details",
            renderKey: `${row.id}:details`,
            row,
          });
        }

        return items;
      })
        : [
            {
              kind: "empty",
              renderKey: "empty-filter-results",
            },
          ],
    [expandedEmployeeIds, sortedRows],
  );

  useEffect(() => {
    if (!expandedEmployeeIds.length) {
      return;
    }

    setExpandedEmployeeIds((current) =>
      current.filter((employeeId) =>
        sortedRows.some((row) => row.id === employeeId),
      ),
    );
  }, [expandedEmployeeIds.length, sortedRows]);

  useEffect(() => {
    if (!showFilters) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        filterMenuRef.current?.contains(target) ||
        target.closest("[data-radix-popper-content-wrapper]")
      ) {
        return;
      }

      setShowFilters(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowFilters(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFilters]);

  function toggleExpandedEmployee(employeeId: string) {
    setExpandedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function resetFilters() {
    setGroupFilter("");
    setStatusFilter("all");
    setTaskPresenceFilter("all");
    setTaskCountFilter("0");
  }

  function applyPreset(nextPreset: Exclude<DatePreset, "custom">) {
    const base = new Date();

    if (nextPreset === "yesterday") {
      const target = addDays(base, -1);
      setDateFrom(formatDateInput(target));
      setDateTo(formatDateInput(target));
    }

    if (nextPreset === "today") {
      setDateFrom(formatDateInput(base));
      setDateTo(formatDateInput(base));
    }

    if (nextPreset === "tomorrow") {
      const target = addDays(base, 1);
      setDateFrom(formatDateInput(target));
      setDateTo(formatDateInput(target));
    }

    setPreset(nextPreset);
  }

  const rangeHero = formatResolvedRangeHeading(
    rangeStart,
    rangeEnd,
    locale,
    preset,
  );
  const isCustomMultiDayRange =
    preset === "custom" && formatDateKey(rangeStart) !== formatDateKey(rangeEnd);
  const pageError = error ?? attendanceHistoryError;

  function renderTaskStatusIcon(
    task: TaskItem,
    taskMeta?: ReturnType<typeof parseTaskMeta>,
  ) {
    const overdue = isTaskOverdue(task, today);
    const hasPhotoProofs = getActivePhotoProofs(task).length > 0;
    const isMeeting = isMeetingTask(task, taskMeta);

    if (isMeeting) {
      return (
        <span className="team-tasks-status-icon is-symbol is-meeting-symbol" aria-hidden="true">
          <UsersRound className="size-4" />
        </span>
      );
    }

    if (task.requiresPhoto) {
      return (
        <span
          className={`team-tasks-status-icon is-symbol is-photo-symbol${
            task.status === "DONE"
              ? " is-done"
              : hasPhotoProofs
                ? " is-has-photo"
                : ""
          }`}
          aria-hidden="true"
        >
          <Camera className="size-3.5" />
        </span>
      );
    }

    if (task.status === "DONE") {
      return (
        <span className="team-tasks-status-icon is-done" aria-hidden="true">
          <Check className="size-3.5" />
        </span>
      );
    }

    if (overdue) {
      return (
        <span className="team-tasks-status-icon is-overdue" aria-hidden="true">
          <CircleX className="size-3.5" />
        </span>
      );
    }

    return (
      <span className="team-tasks-status-icon is-open" aria-hidden="true">
        <Circle className="size-3.5" />
      </span>
    );
  }

  function renderTaskPreview(
    task: TaskItem,
    options?: {
      embedded?: boolean;
    },
  ) {
    const taskMeta = parseTaskMeta(task.description);
    const photoProofs = getActivePhotoProofs(task).filter(
      (proof): proof is (typeof task.photoProofs)[number] & { url: string } =>
        Boolean(proof.url),
    );
    const embedded = options?.embedded ?? false;
    const canOpenPhotos = photoProofs.length > 0;
    const canExpand = canOpenPhotos || Boolean(taskMeta.meeting?.meetingLink);
    const title = getTaskTitle(task, { normalize: true });
    const overdue = isTaskOverdue(task, today);
    const done = task.status === "DONE";

    const taskRow = (
      <>
        <div className="team-tasks-task-line-main">
          {renderTaskStatusIcon(task, taskMeta)}
          <span
            className={`team-tasks-task-line-title ${
              done ? "is-done" : overdue ? "is-overdue" : ""
            }`}
          >
            {title}
          </span>
        </div>
        <div className="team-tasks-task-line-side">
          <span
            className={`team-tasks-task-priority is-${priorityTone(
              task.priority,
            )}`}
          >
            {priorityLabel(task.priority, locale)}
          </span>
          {photoProofs.length && !task.requiresPhoto ? (
            <span className="team-tasks-task-camera-mark" aria-hidden="true">
              <Camera className="size-3.5" />
            </span>
          ) : null}
        </div>
      </>
    );

    return (
      <article
        className={`team-tasks-task-line ${
          done ? "is-done" : overdue ? "is-overdue" : ""
        } ${canExpand ? "is-expandable" : ""} ${embedded ? "is-embedded" : ""}`}
        key={task.id}
      >
        {canOpenPhotos ? (
          <button
            className="team-tasks-task-line-button"
            onClick={() =>
              setPhotoProofDialogTask({
                title,
                proofs: photoProofs.map((proof) => ({
                  id: proof.id,
                  url: proof.url,
                })),
              })
            }
            type="button"
          >
            {taskRow}
          </button>
        ) : taskMeta.meeting?.meetingLink ? (
          <a
            className="team-tasks-task-line-button"
            href={taskMeta.meeting.meetingLink}
            rel="noreferrer"
            target="_blank"
          >
            {taskRow}
          </a>
        ) : (
          <div className="team-tasks-task-line-static">{taskRow}</div>
        )}

      </article>
    );
  }

  function renderTaskCollection(
    tasks: TaskItem[],
    options?: {
      embedded?: boolean;
    },
  ) {
    return tasks.map((task, index) => (
      <div className="team-tasks-task-entry" key={task.id}>
        {index > 0 ? <Separator className="team-tasks-task-separator" /> : null}
        {renderTaskPreview(task, options)}
      </div>
    ));
  }

  function renderStatusBadge(item: TaskTableRow) {
    return (
      <span className={`team-tasks-employee-status is-${item.statusTone}`}>
        <span className="team-tasks-employee-status-dot" aria-hidden="true" />
        {item.statusLabel}
      </span>
    );
  }

  function renderTeamsBadges(item: TaskTableRow) {
    if (!item.teams.length) {
      return <span className="team-tasks-team-text is-empty">—</span>;
    }

    return (
      <span className="team-tasks-team-text">{item.teams.join(", ")}</span>
    );
  }

  return (
    <AdminShell>
      <main className="page-shell section-stack team-tasks-page">
        <section className={`team-tasks-toolbar${preset === "custom" ? " is-custom-open" : ""}`}>
          <div className="team-tasks-heading">
            <p
              className={`team-tasks-focus-label${
                isCustomMultiDayRange ? " is-custom-range" : ""
              }`}
            >
              {rangeHero.weekday ? (
                <span
                  className={`team-tasks-focus-weekday${
                    locale === "ru" ? " is-ru" : ""
                  }`}
                >
                  {rangeHero.weekday}
                </span>
              ) : null}
              <span className="team-tasks-focus-text">{rangeHero.primary}</span>
              {rangeHero.separateYear && rangeHero.year ? (
                <span className="team-tasks-focus-year">{rangeHero.year}</span>
              ) : null}
            </p>
          </div>

          <div className="team-tasks-period-controls">
            {preset === "custom" ? (
              <div className="team-tasks-custom-range">
                <div className="team-tasks-custom-field">
                  <DateRangePicker
                    aria-label={localize(locale, "Период дат", "Date range")}
                    buttonClassName="justify-start whitespace-nowrap"
                    onChange={(value) => {
                      if (!value?.start || !value?.end) {
                        return;
                      }

                      setDateFrom(
                        formatDateInput(value.start.toDate(getLocalTimeZone())),
                      );
                      setDateTo(
                        formatDateInput(value.end.toDate(getLocalTimeZone())),
                      );
                    }}
                    placeholder={localize(locale, "Выберите даты", "Select dates")}
                    size="md"
                    value={parseCalendarDateRangeInput(dateFrom, dateTo)}
                  />
                </div>
              </div>
            ) : null}

            <div className="team-tasks-period-toggle" role="tablist">
              {(
                [
                  {
                    key: "yesterday",
                    label: localize(locale, "Вчера", "Yesterday"),
                  },
                  {
                    key: "today",
                    label: localize(locale, "Сегодня", "Today"),
                  },
                  {
                    key: "tomorrow",
                    label: localize(locale, "Завтра", "Tomorrow"),
                  },
                  {
                    key: "custom",
                    label: localize(locale, "Свой период", "Custom"),
                  },
                ] as const
              ).map((item) => (
                <button
                  aria-pressed={preset === item.key}
                  className={`team-tasks-period-button ${
                    preset === item.key ? "is-active" : ""
                  }`}
                  key={item.key}
                  onClick={() => {
                    if (item.key === "custom") {
                      setPreset("custom");
                      return;
                    }

                    applyPreset(item.key);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="team-tasks-filter-menu" ref={filterMenuRef}>
              <button
                aria-controls="team-tasks-filter-popover"
                aria-expanded={showFilters}
                aria-haspopup="dialog"
                className={`team-tasks-filter-toggle ${showFilters ? "is-open" : ""}`}
                onClick={() => setShowFilters((current) => !current)}
                type="button"
              >
                <span className="team-tasks-filter-toggle-label">
                  <Filter className="size-3.5" />
                  <span>{localize(locale, "Фильтры", "Filters")}</span>
                </span>
                {activeFilterCount > 0 ? (
                  <span className="team-tasks-filter-count">{activeFilterCount}</span>
                ) : null}
              </button>

              {showFilters ? (
                <div
                  className="team-tasks-filter-popover"
                  id="team-tasks-filter-popover"
                  role="dialog"
                >
                  <div className="team-tasks-filter-popover-head">
                    <div className="team-tasks-filter-popover-copy">
                      <strong>{localize(locale, "Фильтры", "Filters")}</strong>
                      <span>
                        {localize(
                          locale,
                          "Быстро сузьте таблицу команды.",
                          "Narrow the team table quickly.",
                        )}
                      </span>
                    </div>
                    {hasActiveFilters ? (
                      <button
                        className="team-tasks-filter-clear"
                        onClick={resetFilters}
                        type="button"
                      >
                        {localize(locale, "Сбросить", "Reset")}
                      </button>
                    ) : null}
                  </div>

                  <div className="team-tasks-filters-grid">
                    <div className="team-tasks-filter-field">
                      <AppSelectField
                        className="team-tasks-filter-select"
                        emptyLabel={localize(locale, "Все команды", "All teams")}
                        onValueChange={setGroupFilter}
                        options={groupOptions}
                        placeholder={localize(locale, "Команда", "Team")}
                        value={groupFilter}
                      />
                    </div>
                    <div className="team-tasks-filter-field">
                      <AppSelectField
                        className="team-tasks-filter-select"
                        onValueChange={setStatusFilter}
                        options={statusFilterOptions}
                        value={statusFilter}
                      />
                    </div>
                    <div className="team-tasks-filter-field">
                      <AppSelectField
                        className="team-tasks-filter-select"
                        onValueChange={setTaskPresenceFilter}
                        options={[
                          { value: "all", label: localize(locale, "Любые задачи", "Any task state") },
                          { value: "with_tasks", label: localize(locale, "Есть задачи", "Has tasks") },
                          { value: "without_tasks", label: localize(locale, "Без задач", "No tasks") },
                        ]}
                        value={taskPresenceFilter}
                      />
                    </div>
                    <div className="team-tasks-filter-field">
                      <AppSelectField
                        className="team-tasks-filter-select"
                        onValueChange={setTaskCountFilter}
                        options={[
                          { value: "0", label: localize(locale, "Любое кол-во задач", "Any task count") },
                          { value: "1", label: localize(locale, "От 1 задачи", "From 1 task") },
                          { value: "3", label: localize(locale, "От 3 задач", "From 3 tasks") },
                          { value: "5", label: localize(locale, "От 5 задач", "From 5 tasks") },
                        ]}
                        value={taskCountFilter}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {pageError ? (
          <div className="warning-banner">
            <AlertCircle className="size-4" />
            <span>{pageError}</span>
          </div>
        ) : null}

        {loading ? (
          <section className="team-tasks-loading-panel" aria-live="polite">
            <CalendarDays className="size-4" />
            <span>
              {localize(
                locale,
                "Собираем задачи команды...",
                "Loading team tasks...",
              )}
            </span>
          </section>
            ) : (
          <section className="team-tasks-list">
              <div className="relative mb-2 min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 w-full rounded-xl border-border bg-secondary/30 pl-9 font-heading"
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder={localize(
                    locale,
                    "Поиск сотрудника...",
                    "Search employee...",
                  )}
                  value={employeeSearch}
                />
              </div>
              <div className="team-tasks-table-card">
                <div className="team-tasks-table-shell">
                  <Table
                    aria-label={localize(locale, "Таблица задач команды", "Team tasks table")}
                    onSortChange={setSortDescriptor}
                    size="sm"
                    sortDescriptor={sortDescriptor}
                  >
                    <Table.Header>
                      <Table.Head
                        allowsSorting
                        className="w-[46%] min-w-[320px]"
                        id="employeeName"
                        isRowHeader
                        label={`${localize(locale, "Сотрудники", "Employees")} ${sortedRows.length}`}
                      />
                      <Table.Head
                        allowsSorting
                        className="w-[18%] min-w-[170px] team-tasks-head-center"
                        id="status"
                        label={localize(locale, "Статус", "Status")}
                      />
                      <Table.Head
                        allowsSorting
                        className="w-[18%] min-w-[170px] team-tasks-head-center"
                        id="teams"
                        label={localize(locale, "Команды", "Teams")}
                      />
                      <Table.Head
                        allowsSorting
                        className="w-[18%] min-w-[170px] team-tasks-head-center team-tasks-head-progress"
                        id="tasks"
                        label={`${localize(locale, "Задачи", "Tasks")} ${teamSummary.completed} ${localize(locale, "из", "of")} ${teamSummary.total}`}
                      />
                    </Table.Header>

                    <Table.Body items={renderRows}>
                      {(item) => {
                      if (item.kind === "empty") {
                        return (
                          <Table.Row className="team-tasks-table-row team-tasks-table-row--empty" id={item.renderKey}>
                            <Table.Cell className="team-tasks-empty-cell" colSpan={4}>
                              {localize(
                                locale,
                                hasActiveFilters
                                  ? "По этим фильтрам сотрудники не найдены"
                                  : "В выбранном периоде задач пока нет",
                                hasActiveFilters
                                  ? "No employees match these filters"
                                  : "No tasks were found in this range",
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      if (item.kind === "details") {
                        const recurringTasks = item.row.entry.tasks.filter((task) => task.isRecurring);
                        const regularTasks = item.row.entry.tasks.filter((task) => !task.isRecurring);

                        return (
                          <Table.Row
                            className={`team-tasks-detail-row ${
                              item.row.isComplete ? "is-complete" : ""
                            } !h-auto`}
                            id={item.renderKey}
                          >
                            <Table.Cell className="team-tasks-detail-cell" colSpan={4}>
                              <div className="team-tasks-detail-panel">
                                {item.row.entry.tasks.length ? (
                                  <div className="team-tasks-inline-details">
                                    <div className="team-tasks-detail-list">
                                      {renderTaskCollection(regularTasks)}

                                      {recurringTasks.length ? (
                                        <section className="team-tasks-routine-box">
                                          <div className="team-tasks-routine-label">
                                            {localize(locale, "Повседневные задачи", "Routine tasks")}
                                          </div>
                                          <div className="team-tasks-routine-list">
                                            {renderTaskCollection(recurringTasks, {
                                              embedded: true,
                                            })}
                                          </div>
                                        </section>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="team-tasks-inline-details">
                                    <div className="team-tasks-group-empty">
                                      {localize(
                                        locale,
                                        "На выбранный день задач нет",
                                        "No tasks for the selected day",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      return (
                        <Table.Row
                          className={`team-tasks-table-row ${
                            item.isComplete ? "is-complete" : ""
                          } ${expandedEmployeeIds.includes(item.id) ? "is-open" : ""
                          }`}
                          id={item.renderKey}
                        >
                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--identity"
                              onClick={() => toggleExpandedEmployee(item.id)}
                              type="button"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar
                                  alt={item.employeeName}
                                  className="shrink-0"
                                  initials={item.employeeInitials}
                                  size="sm"
                                  src={item.employeeAvatarUrl}
                                />
                                <div className="min-w-0 space-y-0.5">
                                  <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                                    {item.employeeName}
                                  </p>
                                  {item.employeeSubtitle ? (
                                    <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                                      {item.employeeSubtitle}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle whitespace-nowrap">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--center"
                              onClick={() => toggleExpandedEmployee(item.id)}
                              type="button"
                            >
                              {renderStatusBadge(item)}
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--center"
                              onClick={() => toggleExpandedEmployee(item.id)}
                              type="button"
                            >
                              {renderTeamsBadges(item)}
                            </button>
                          </Table.Cell>

                          <Table.Cell className="align-middle">
                            <button
                              className="team-tasks-row-button team-tasks-row-button--progress"
                              onClick={() => toggleExpandedEmployee(item.id)}
                              type="button"
                            >
                              <strong className="text-[1.05rem] font-semibold text-[color:var(--foreground)]">
                                {item.tasksProgressLabel}
                              </strong>
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    }}
                    </Table.Body>
                  </Table>
                </div>
              </div>
          </section>
        )}

        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setPhotoProofDialogTask(null);
            }
          }}
          open={Boolean(photoProofDialogTask)}
        >
          <DialogContent className="team-tasks-photo-dialog">
            <DialogHeader className="gap-2 pr-10">
              <DialogTitle>
                {photoProofDialogTask?.title ?? localize(locale, "Фотоотчёты", "Photo proofs")}
              </DialogTitle>
              <DialogDescription>
                {localize(
                  locale,
                  "Все фотографии, приложенные к выполнению этой задачи.",
                  "All photos attached to this completed task.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="team-tasks-photo-dialog-grid">
              {photoProofDialogTask?.proofs.map((proof) => (
                <a
                  className="team-tasks-photo-dialog-card"
                  href={proof.url}
                  key={proof.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <img
                    alt={localize(locale, "Фотоотчёт по задаче", "Task photo proof")}
                    className="team-tasks-photo-dialog-image"
                    src={proof.url}
                  />
                </a>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AdminShell>
  );
}
