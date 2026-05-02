"use client";

import { getLocalTimeZone, parseDate } from "@internationalized/date";
import {
  AttendanceBootstrapResponse,
  AttendanceHistoryResponse,
  AttendanceLiveSession,
  CollaborationTaskBoardResponse,
  ManagerTasksBootstrapResponse,
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
  ChevronDown,
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

type TaskSearchMatch = {
  actorName: string;
  creatorName: string;
  dateDay: string;
  dateMonth: string;
  employeeAvatarUrl: string | null;
  employeeId: string | null;
  employeeInitials: string;
  employeeName: string;
  id: string;
  photoProofs: { id: string; url: string }[];
  statusLabel: string;
  statusTone: "success" | "neutral" | "gray" | "error";
  timeLabel: string;
  title: string;
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

function getTaskDeadlineDate(task: TaskItem) {
  if (task.dueAt) {
    const dueAt = new Date(task.dueAt);
    if (!Number.isNaN(dueAt.getTime())) {
      return dueAt;
    }
  }

  if (task.occurrenceDate) {
    const occurrenceDate = new Date(task.occurrenceDate);
    if (!Number.isNaN(occurrenceDate.getTime())) {
      return endOfDay(occurrenceDate);
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

function isTaskCompletedLate(task: TaskItem) {
  if (task.status !== "DONE" || !task.completedAt) {
    return false;
  }

  const completedAt = new Date(task.completedAt);
  const deadlineAt = getTaskDeadlineDate(task);

  if (Number.isNaN(completedAt.getTime()) || !deadlineAt) {
    return false;
  }

  return completedAt.getTime() > deadlineAt.getTime();
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

function formatSearchDateParts(
  value: string | Date | null | undefined,
  locale: string,
) {
  if (!value) {
    return { day: "—", month: "" };
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { day: "—", month: "" };
  }

  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  return {
    day: parsed.toLocaleDateString(dateLocale, { day: "2-digit" }),
    month: parsed
      .toLocaleDateString(dateLocale, { month: "short" })
      .replace(".", "")
      .toUpperCase(),
  };
}

function formatSearchStatusDate(
  value: string | Date | null | undefined,
  locale: string,
  options?: { includeTime?: boolean },
) {
  if (!value) {
    return "—";
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const dateLabel = parsed
    .toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "short",
    })
    .replace(".", "");

  if (!options?.includeTime) {
    return dateLabel;
  }

  const timeLabel = parsed.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateLabel}, ${timeLabel}`;
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

function formatDateTimeLabel(value: string | null | undefined, locale: string) {
  if (!value) {
    return "—";
  }

  const date = formatDateLabel(value, locale);
  const hasExplicitTime = /\d{2}:\d{2}/.test(value);

  if (!hasExplicitTime) {
    return date;
  }

  return `${date}, ${formatTimeOfDay(value, locale)}`;
}

function getTaskCompletionActor(task: TaskItem) {
  const statusActivity = task.activities
    .slice()
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .find(
      (activity) =>
        activity.kind === "STATUS_CHANGED" &&
        (task.status === "DONE" || /\bDONE\b/i.test(activity.body ?? "")),
    );

  return statusActivity?.actorEmployee ?? task.assigneeEmployee ?? task.managerEmployee;
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

type ManagerTasksCachePayload =
  ManagerTasksBootstrapResponse<EmployeeDirectoryItem>;

export type ManagerTasksPageInitialData = ManagerTasksCachePayload;

function buildManagerTasksCacheKey(
  session: ReturnType<typeof getSession>,
  dateFrom: string,
  dateTo: string,
) {
  return session
    ? `manager-tasks:${session.user.id}:${dateFrom}:${dateTo}`
    : null;
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
  const canSeeTaskCreator = session
    ? hasManagerAccess(session.user.roleCodes)
    : false;
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
  const latestSnapshotRequestKey = useRef<string | null>(null);

  function applyCachedSnapshot(snapshot: ManagerTasksCachePayload) {
    setTasks(snapshot.tasks);
    setEmployees(snapshot.employees);
    setGroups(snapshot.groups);
    setLiveSessions(snapshot.liveSessions);
  }

  async function loadTasksSnapshot(options: {
    dateFrom: string;
    dateTo: string;
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

    const query = new URLSearchParams({
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
    }).toString();
    latestSnapshotRequestKey.current = query;

    try {
      const snapshot = await apiRequest<ManagerTasksCachePayload>(
        `/bootstrap/tasks?${query}`,
        {
          token: session.accessToken,
          skipClientCache: options?.force ?? false,
        },
      );
      if (latestSnapshotRequestKey.current !== query) {
        return;
      }
      setError(null);
      applyCachedSnapshot(snapshot);
    } catch (loadError) {
      if (latestSnapshotRequestKey.current !== query) {
        return;
      }

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
  const tasksCacheKey = useMemo(
    () => buildManagerTasksCacheKey(session, resolvedDateFrom, resolvedDateTo),
    [resolvedDateFrom, resolvedDateTo, session],
  );
  const isHistoricalRange = useMemo(
    () => rangeEnd.getTime() < today.getTime(),
    [rangeEnd, today],
  );

  useEffect(() => {
    if (!accessChecked) {
      return;
    }

    if (!session) {
      return;
    }

    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      applyCachedSnapshot(initialData);
      if (tasksCacheKey) {
        writeClientCache(tasksCacheKey, initialData);
      }
      setError(null);
      setLoading(false);
      void loadTasksSnapshot({
        dateFrom: resolvedDateFrom,
        dateTo: resolvedDateTo,
        force: true,
        silent: true,
      });
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
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
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
  }, [
    accessChecked,
    initialData,
    locale,
    resolvedDateFrom,
    resolvedDateTo,
    tasksCacheKey,
  ]);

  useWorkspaceAutoRefresh({
    session,
    enabled: accessChecked && Boolean(session),
    onRefresh: async () => {
      await loadTasksSnapshot({
        dateFrom: resolvedDateFrom,
        dateTo: resolvedDateTo,
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

    void apiRequest<AttendanceBootstrapResponse>(`/bootstrap/attendance?${query}`, {
      token: accessToken,
    })
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setAttendanceHistory(snapshot.history);
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

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  const searchQuery = employeeSearch.trim().toLowerCase();
  const taskSearchMatches = useMemo<TaskSearchMatch[]>(() => {
    if (!searchQuery) {
      return [];
    }

    return visibleTasks
      .map((task) => {
        const title = getTaskTitle(task, { normalize: true });
        const haystack = [title, task.title].join(" ").toLowerCase();

        if (!haystack.includes(searchQuery)) {
          return null;
        }

        const isDone = task.status === "DONE";
        const completedLate = isTaskCompletedLate(task);
        const isMissed = isTaskOverdue(task, today);
        const isCancelled = task.status === "CANCELLED";
        const lateStatusIncludesTime = Boolean(task.dueAt);
        const actor = isDone
          ? getTaskCompletionActor(task)
          : task.assigneeEmployee ?? task.managerEmployee;
        const employeeName = task.assigneeEmployee
          ? getEmployeeName(task.assigneeEmployee, locale)
          : task.group?.name ?? localize(locale, "Команда", "Team");
        const statusLabel = isDone
          ? completedLate
            ? localize(
                locale,
                `Выполнено ${formatSearchStatusDate(
                  task.completedAt,
                  locale,
                  { includeTime: lateStatusIncludesTime },
                )} вместо ${formatSearchStatusDate(
                  getTaskDeadlineDate(task),
                  locale,
                  { includeTime: lateStatusIncludesTime },
                )}`,
                `Done ${formatSearchStatusDate(
                  task.completedAt,
                  locale,
                  { includeTime: lateStatusIncludesTime },
                )} instead of ${formatSearchStatusDate(
                  getTaskDeadlineDate(task),
                  locale,
                  { includeTime: lateStatusIncludesTime },
                )}`,
              )
            : "DONE"
          : isMissed
            ? localize(locale, "Не сделано", "Not done")
            : isCancelled
              ? localize(locale, "Отменена", "Cancelled")
              : "";
        const timeSource = isDone
          ? task.completedAt ?? task.updatedAt
          : isMissed
            ? task.dueAt ?? task.occurrenceDate
            : isCancelled
              ? task.updatedAt
              : task.dueAt ?? task.occurrenceDate ?? task.createdAt;
        const dateParts = formatSearchDateParts(timeSource, locale);
        const directoryEmployee = task.assigneeEmployeeId
          ? employeeById.get(task.assigneeEmployeeId) ?? null
          : null;
        const employeeInitials = task.assigneeEmployee
          ? getEmployeeInitials(task.assigneeEmployee)
          : (task.group?.name.slice(0, 2).toUpperCase() ?? "TM");
        const photoProofs = getActivePhotoProofs(task)
          .filter(
            (proof): proof is (typeof task.photoProofs)[number] & { url: string } =>
              Boolean(proof.url),
          )
          .map((proof) => ({
            id: proof.id,
            url: proof.url,
          }));

        return {
          match: {
            actorName: getEmployeeName(actor, locale),
            creatorName: getEmployeeName(task.managerEmployee, locale),
            dateDay: dateParts.day,
            dateMonth: dateParts.month,
            employeeAvatarUrl: directoryEmployee?.avatarUrl ?? null,
            employeeId: task.assigneeEmployeeId,
            employeeInitials,
            employeeName,
            id: task.id,
            photoProofs,
            statusLabel,
            statusTone: isDone
              ? completedLate
                ? "error"
                : "success"
              : isMissed
                ? "error"
                : isCancelled
                  ? "gray"
                  : "neutral",
            timeLabel: formatDateTimeLabel(timeSource, locale),
            title,
          } satisfies TaskSearchMatch,
          sortTime:
            (timeSource ? new Date(timeSource).getTime() : NaN) ||
            getTaskAnchorDate(task)?.getTime() ||
            0,
        };
      })
      .filter(
        (item): item is { match: TaskSearchMatch; sortTime: number } =>
          Boolean(item),
      )
      .sort((left, right) => right.sortTime - left.sortTime)
      .map((item) => item.match);
  }, [employeeById, getTaskTitle, locale, searchQuery, today, visibleTasks]);

  const taskSearchMatchIds = useMemo(
    () => new Set(taskSearchMatches.map((match) => match.id)),
    [taskSearchMatches],
  );

  const taskSearchEmployeeIds = useMemo(
    () =>
      new Set(
        taskSearchMatches
          .map((match) => match.employeeId)
          .filter((employeeId): employeeId is string => Boolean(employeeId)),
      ),
    [taskSearchMatches],
  );

  const visibleTaskSearchMatches = useMemo(
    () => taskSearchMatches.slice(0, 8),
    [taskSearchMatches],
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
    const selectedGroupName = groupFilter
      ? groups.find((group) => group.id === groupFilter)?.name ?? null
      : null;

    return tableRows.filter((row) => {
      const matchesTaskSearch = row.entry.tasks.some((task) =>
        taskSearchMatchIds.has(task.id),
      );

      if (
        searchQuery &&
        !matchesTaskSearch &&
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
    groupFilter,
    groups,
    searchQuery,
    statusFilter,
    tableRows,
    taskCountFilter,
    taskPresenceFilter,
    taskSearchMatchIds,
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
        const isExpanded =
          expandedEmployeeIds.includes(row.id) || taskSearchEmployeeIds.has(row.id);
        const items: TaskRenderRow[] = [
          {
            ...row,
            kind: "summary",
            renderKey: `${row.id}:summary`,
          },
        ];

        if (isExpanded) {
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
    [expandedEmployeeIds, sortedRows, taskSearchEmployeeIds],
  );

  useEffect(() => {
    if (!expandedEmployeeIds.length) {
      return;
    }

    setExpandedEmployeeIds((current) => {
      const next = current.filter((employeeId) =>
        sortedRows.some((row) => row.id === employeeId),
      );

      if (
        next.length === current.length &&
        next.every((employeeId, index) => employeeId === current[index])
      ) {
        return current;
      }

      return next;
    });
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
          <span className="team-tasks-task-line-copy">
            <span
              className={`team-tasks-task-line-title ${
                done ? "is-done" : overdue ? "is-overdue" : ""
              }`}
            >
              {title}
            </span>
            {canSeeTaskCreator ? (
              <span className="team-tasks-task-line-creator">
                {localize(locale, "Создал", "Created by")}:{" "}
                {getEmployeeName(task.managerEmployee, locale)}
              </span>
            ) : null}
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
                    "Поиск сотрудника или задачи...",
                    "Search employee or task...",
                  )}
                  value={employeeSearch}
                />
              </div>
              {searchQuery && visibleTaskSearchMatches.length ? (
                <div className="team-tasks-search-results" aria-live="polite">
                  <div className="team-tasks-search-results-head">
                    <strong>
                      {localize(locale, "Найденные задачи", "Found tasks")}
                    </strong>
                    <span>
                      {visibleTaskSearchMatches.length}
                      {taskSearchMatches.length > visibleTaskSearchMatches.length
                        ? ` ${localize(locale, "из", "of")} ${taskSearchMatches.length}`
                        : ""}
                    </span>
                  </div>
                  <div className="team-tasks-search-result-list">
                    {visibleTaskSearchMatches.map((match) => (
                      <article
                        aria-label={`${match.title}, ${match.employeeName}, ${match.timeLabel}`}
                        className={`team-tasks-search-result is-${match.statusTone}`}
                        key={match.id}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }

                          event.preventDefault();
                          const employeeId = match.employeeId;
                          if (employeeId) {
                            setExpandedEmployeeIds((current) =>
                              current.includes(employeeId)
                                ? current
                                : [...current, employeeId],
                            );
                          }
                        }}
                        onClick={() => {
                          const employeeId = match.employeeId;
                          if (employeeId) {
                            setExpandedEmployeeIds((current) =>
                              current.includes(employeeId)
                                ? current
                                : [...current, employeeId],
                            );
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <time className="team-tasks-search-result-date">
                          <span>{match.dateDay}</span>
                          <span>{match.dateMonth}</span>
                        </time>
                        <div className="team-tasks-search-result-main">
                          <strong>{match.title}</strong>
                          {match.statusLabel ? (
                            <span
                              className={`team-tasks-search-result-status is-${match.statusTone}`}
                            >
                              {match.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="team-tasks-search-result-side">
                          <Avatar
                            alt={match.employeeName}
                            className="team-tasks-search-result-avatar"
                            initials={match.employeeInitials}
                            size="sm"
                            src={match.employeeAvatarUrl}
                          />
                          <span>{match.employeeName}</span>
                        </div>
                        <div className="team-tasks-search-result-action">
                          {match.photoProofs.length > 0 ? (
                            <button
                              aria-label={localize(
                                locale,
                                "Посмотреть фото задачи",
                                "View task photo",
                              )}
                              className="team-tasks-search-result-photo-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPhotoProofDialogTask({
                                  title: match.title,
                                  proofs: match.photoProofs,
                                });
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                              }}
                              type="button"
                            >
                              <Camera className="size-4" />
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
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
                                hasActiveFilters || Boolean(searchQuery)
                                  ? "По этим фильтрам сотрудники не найдены"
                                  : "В выбранном периоде задач пока нет",
                                hasActiveFilters || Boolean(searchQuery)
                                  ? "No employees match these filters"
                                  : "No tasks were found in this range",
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      if (item.kind === "details") {
                        const hasRowTaskSearchMatches = item.row.entry.tasks.some((task) =>
                          taskSearchMatchIds.has(task.id),
                        );
                        const detailTasks =
                          hasRowTaskSearchMatches
                            ? item.row.entry.tasks.filter((task) =>
                                taskSearchMatchIds.has(task.id),
                              )
                            : item.row.entry.tasks;
                        const recurringTasks = detailTasks.filter((task) => task.isRecurring);
                        const regularTasks = detailTasks.filter((task) => !task.isRecurring);

                        return (
                          <Table.Row
                            className={`team-tasks-detail-row ${
                              item.row.isComplete ? "is-complete" : ""
                            } !h-auto`}
                            id={item.renderKey}
                          >
                            <Table.Cell className="team-tasks-detail-cell" colSpan={4}>
                              <div className="team-tasks-detail-panel">
                                {detailTasks.length ? (
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
                                        hasRowTaskSearchMatches
                                          ? "По этому названию задач нет"
                                          : "На выбранный день задач нет",
                                        hasRowTaskSearchMatches
                                          ? "No tasks match this title"
                                          : "No tasks for the selected day",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      const isEmployeeOpen =
                        expandedEmployeeIds.includes(item.id) ||
                        taskSearchEmployeeIds.has(item.id);

                      return (
                        <Table.Row
                          className={`team-tasks-table-row ${
                            item.isComplete ? "is-complete" : ""
                          } ${isEmployeeOpen ? "is-open" : ""}`}
                          id={item.renderKey}
                        >
                          <Table.Cell className="align-middle">
                            <button
                              aria-expanded={isEmployeeOpen}
                              className="team-tasks-row-button team-tasks-row-button--identity"
                              onClick={() => toggleExpandedEmployee(item.id)}
                              type="button"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`team-tasks-row-chevron ${
                                    isEmployeeOpen ? "is-open" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  <ChevronDown size={16} strokeWidth={2.3} />
                                </span>
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
                              <strong className="team-tasks-row-progress-label text-[1.05rem] font-semibold text-[color:var(--foreground)]">
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
