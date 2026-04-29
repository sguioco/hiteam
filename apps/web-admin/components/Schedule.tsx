"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  History,
  Plus,
  Users,
} from "lucide-react";
import {
  ApprovalInboxItem,
  AttendanceBootstrapResponse,
  AttendanceHistoryResponse,
  CollaborationTaskBoardResponse,
  DashboardBootstrapResponse,
  EmployeeApiRecord,
  ManagerScheduleBootstrapResponse,
  NamedEntityOption,
  ScheduleBootstrapInitialData,
  ScheduleShiftRecord,
  ScheduleShiftTemplateRecord,
  TaskItem,
} from "@smart/types";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectOptionAvatar,
  SelectOptionContent,
  SelectOptionDescription,
  SelectOptionText,
  SelectOptionTitle,
  SelectTrigger,
  SelectTriggerLabel,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { getSession, isEmployeeOnlyRole } from "@/lib/auth";
import { isDemoAccessToken } from "@/lib/demo-mode";
import { useI18n } from "@/lib/i18n";
import { createMockScheduleData } from "@/lib/mock-admin-data";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { parseTaskMeta } from "@/lib/task-meta";
import { useTranslatedTaskCopy } from "@/lib/use-translated-task-copy";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

type TabKey =
  | "schedules"
  | "requests"
  | "changelog";

type PeriodMode = "week" | "month";
type CalendarEventFilter = "all" | "shifts" | "tasks" | "meetings";

type Option = NamedEntityOption;
type ShiftTemplateRecord = ScheduleShiftTemplateRecord;
type ShiftRecord = ScheduleShiftRecord;

type AttendanceHistoryRow = AttendanceHistoryResponse["rows"][number];

export type ScheduleInitialData = ScheduleBootstrapInitialData;

type EnrichedShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  avatarSrc: string;
  shiftDate: Date;
  startsAtDate: Date;
  endsAtDate: Date;
  startsAt: string;
  endsAt: string;
  templateName: string;
  templateStartsAtLocal: string;
  templateEndsAtLocal: string;
  locationId: string;
  locationName: string;
  departmentId: string | null;
  departmentName: string;
  roleId: string | null;
  roleName: string;
  createdAt: string;
  updatedAt: string;
};

type ChangeLogEntry = {
  id: string;
  action: string;
  target: string;
  occurredAt: string;
  meta: string;
};

type CalendarTaskEvent = {
  assigneeName: string;
  completedAt: string | null;
  date: Date;
  description: string;
  employeeId: string | null;
  employeeNumber: string;
  id: string;
  isDone: boolean;
  kind: "task" | "meeting";
  locationId: string | null;
  locationName: string;
  photoProofs: Array<{
    id: string;
    url: string;
  }>;
  roleId: string | null;
  roleName: string;
  departmentId: string | null;
  departmentName: string;
  requiresPhoto: boolean;
  time: string;
  title: string;
};

type CalendarDayEntryDetail = {
  avatarSrc: string;
  employeeId: string | null;
  id: string;
  metaLabel?: string;
  photoProofs?: Array<{
    id: string;
    url: string;
  }>;
  statusLabel?: string;
  statusPlacement?: "badge" | "inline";
  statusTone?: "success" | "gray" | "error";
  title: string;
  subtitle?: string;
};

type CalendarDayEntry = {
  detailItems: CalendarDayEntryDetail[];
  employeeId: string | null;
  employeeIds: string[];
  id: string;
  isDone?: boolean;
  kind: "shift" | "task" | "meeting";
  peopleCount: number;
  previewLabel: string;
  sortTime: string;
  statusTone?: "success" | "gray" | "error";
  subtitle: string;
  time: string;
  title: string;
};

type CreateShiftDraft = {
  employeeId: string;
  templateId: string;
  shiftDate: string;
};

type CreateTemplateDraft = {
  name: string;
  startsAtLocal: string;
  endsAtLocal: string;
  weekDays: number[];
};

type MassAssignDraft = {
  templateId: string;
  dateFrom: string;
  dateTo: string;
  departmentId: string;
  locationId: string;
  roleId: string;
};

const requestStatusClasses: Record<string, string> = {
  PENDING: "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
  APPROVED: "bg-[color:var(--soft-success)] text-[color:var(--success)]",
  REJECTED: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
  CANCELLED: "bg-secondary text-muted-foreground",
};

function buildEmployeeName(employee: {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return [employee.lastName, employee.firstName, employee.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((chunk) => chunk[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function cloneDate(value: Date) {
  return new Date(value.getTime());
}

function addDays(value: Date, amount: number) {
  const next = cloneDate(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  const next = cloneDate(value);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function subMonths(value: Date, amount: number) {
  return addMonths(value, -amount);
}

function startOfMonthLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonthLocal(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function startOfWeekLocal(value: Date) {
  const next = cloneDate(value);
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeekLocal(value: Date) {
  const next = startOfWeekLocal(value);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function eachDayBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = cloneDate(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    days.push(cloneDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function isSameDayLocal(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonthLocal(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function isTodayLocal(value: Date) {
  return isSameDayLocal(value, new Date());
}

function startOfDayLocal(value: Date) {
  const next = cloneDate(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseIsoDate(value: string) {
  return new Date(value);
}

function buildPlannedShiftBoundary(day: Date, timeValue: string) {
  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  const next = startOfDayLocal(day);

  next.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );

  return next;
}

function buildPlannedShiftRange(
  day: Date,
  startsAtLocal: string,
  endsAtLocal: string,
) {
  const startsAt = buildPlannedShiftBoundary(day, startsAtLocal);
  const endsAt = buildPlannedShiftBoundary(day, endsAtLocal);

  if (endsAt.getTime() <= startsAt.getTime()) {
    endsAt.setDate(endsAt.getDate() + 1);
  }

  return {
    startsAt,
    endsAt,
  };
}

function buildTemplateCode(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .toUpperCase()
    .slice(0, 24);

  return normalized || "SHIFT";
}

function formatDateTime(
  value: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
) {
  return value.toLocaleDateString(locale, options);
}

function formatTime(value: Date, locale = "en-US") {
  return value.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActivePhotoProofs(task: TaskItem) {
  return task.photoProofs.filter(
    (proof) => !proof.deletedAt && !proof.supersededByProofId && Boolean(proof.url),
  ) as Array<(typeof task.photoProofs)[number] & { url: string }>;
}

function buildAttendanceHistoryKey(employeeId: string, day: Date) {
  return `${employeeId}:${formatDateInput(day)}`;
}

function buildAttendanceSummary(
  rows: AttendanceHistoryRow[],
  locale: "ru" | "en",
  options?: {
    plannedStartsAt?: Date;
    plannedEndsAt?: Date;
  },
): {
  isAbsent: boolean;
  label: string;
  metaLabel: string | null;
  tone: "success" | "gray" | "error";
} {
  if (!rows.length) {
    return {
      isAbsent: true,
      label: locale === "ru" ? "Отсутствовал" : "Absent",
      metaLabel: null,
      tone: "error" as const,
    };
  }

  const sortedRows = rows
    .slice()
    .sort(
      (left, right) =>
        parseIsoDate(left.startedAt).getTime() - parseIsoDate(right.startedAt).getTime(),
    );
  const firstRow = sortedRows[0];
  const lastCompletedRow = [...sortedRows]
    .reverse()
    .find((row) => row.endedAt || row.checkOutEvent?.occurredAt);
  const startedAt = formatTime(parseIsoDate(firstRow.startedAt), locale === "ru" ? "ru-RU" : "en-US");
  const endedAtSource =
    lastCompletedRow?.endedAt ?? lastCompletedRow?.checkOutEvent?.occurredAt ?? null;
  const endedAt = endedAtSource
    ? formatTime(parseIsoDate(endedAtSource), locale === "ru" ? "ru-RU" : "en-US")
    : "—";
  const actualStartedAt = parseIsoDate(firstRow.startedAt);
  const actualEndedAt = endedAtSource ? parseIsoDate(endedAtSource) : null;
  const plannedStartsAt = options?.plannedStartsAt;
  const plannedEndsAt = options?.plannedEndsAt;
  const lateMinutes =
    plannedStartsAt && !Number.isNaN(actualStartedAt.getTime())
      ? Math.max(
          0,
          Math.round((actualStartedAt.getTime() - plannedStartsAt.getTime()) / 60000),
        )
      : sortedRows.reduce((sum, row) => sum + row.lateMinutes, 0);
  const earlyLeaveMinutes =
    plannedEndsAt && actualEndedAt && !Number.isNaN(actualEndedAt.getTime())
      ? Math.max(
          0,
          Math.round((plannedEndsAt.getTime() - actualEndedAt.getTime()) / 60000),
        )
      : sortedRows.reduce((sum, row) => sum + row.earlyLeaveMinutes, 0);
  const deviations: string[] = [];

  if (lateMinutes > 0) {
    deviations.push(
      locale === "ru" ? `опоздание ${lateMinutes} мин` : `${lateMinutes} min late`,
    );
  }

  if (earlyLeaveMinutes > 0) {
    deviations.push(
      locale === "ru"
        ? `ранний уход ${earlyLeaveMinutes} мин`
        : `${earlyLeaveMinutes} min early`,
    );
  }

  return {
    isAbsent: false,
    label: `${startedAt}-${endedAt}`,
    metaLabel: deviations.length
      ? deviations.join(" · ")
      : locale === "ru"
        ? "По факту без отклонений"
        : "Actual time, no deviations",
    tone: lateMinutes > 0 || earlyLeaveMinutes > 0 ? "error" : "success",
  };
}

function getEntryToneTextClass(tone?: "success" | "gray" | "error") {
  if (tone === "error") {
    return "text-rose-600";
  }

  if (tone === "success") {
    return "text-emerald-600";
  }

  if (tone === "gray") {
    return "text-muted-foreground";
  }

  return null;
}

function getStatusBadgeClass(tone?: "success" | "gray" | "error") {
  if (tone === "error") {
    return "bg-rose-50 text-rose-600";
  }

  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-secondary text-muted-foreground";
}

function parseTemplateWeekDays(weekDaysJson?: string | null) {
  if (!weekDaysJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(weekDaysJson) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const values = parsed
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7);

    return values.length > 0 ? values : null;
  } catch {
    return null;
  }
}

function formatTemplateWeekDaysSummary(weekDaysJson: string | null | undefined, dayHeaders: readonly string[], localeTag: string) {
  const days = parseTemplateWeekDays(weekDaysJson);

  if (!days) {
    return localeTag === "ru-RU" ? "Каждый день" : "Every day";
  }

  if (days.length === 7) {
    return localeTag === "ru-RU" ? "Каждый день" : "Every day";
  }

  return days.map((day) => dayHeaders[day - 1] ?? String(day)).join(", ");
}

function formatCalendarLabel(
  date: Date,
  mode: PeriodMode,
  days: Date[],
  locale = "en-US",
) {
  if (mode === "week") {
    return `${formatDateTime(days[0], {
      day: "numeric",
      month: "short",
    }, locale)} - ${formatDateTime(days[days.length - 1], {
      day: "numeric",
      month: "short",
      year: "numeric",
    }, locale)}`;
  }

  const monthLabel = formatDateTime(date, { month: "long", year: "numeric" }, locale);
  return locale.startsWith("ru") ? monthLabel.replace(/\s*г\.$/, "") : monthLabel;
}

function buildCalendarDays(cursor: Date, period: PeriodMode) {
  if (period === "week") {
    return eachDayBetween(startOfWeekLocal(cursor), endOfWeekLocal(cursor));
  }

  const monthStart = startOfMonthLocal(cursor);
  const monthEnd = endOfMonthLocal(cursor);
  const monthDays = eachDayBetween(monthStart, monthEnd);
  const leading = (monthStart.getDay() + 6) % 7;
  const trailing = (7 - ((leading + monthDays.length) % 7)) % 7;

  return [
    ...Array.from({ length: leading }, (_, index) =>
      addDays(monthStart, index - leading),
    ),
    ...monthDays,
    ...Array.from({ length: trailing }, (_, index) =>
      addDays(monthEnd, index + 1),
    ),
  ];
}

function getScheduleEventTone(kind: "shift" | "task" | "meeting") {
  if (kind === "meeting") return "is-meeting";
  if (kind === "task") return "is-task";
  return "is-shift";
}

function buildRangeDays(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) {
    return [];
  }

  const start = parseIsoDate(dateFrom);
  const end = parseIsoDate(dateTo);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  return eachDayBetween(start, end);
}

const initialTemplateDraft: CreateTemplateDraft = {
  name: "",
  startsAtLocal: "09:00",
  endsAtLocal: "18:00",
  weekDays: [1, 2, 3, 4, 5],
};

const EMPTY_SELECT_VALUE = "__empty_select__";

const scheduleCopy = {
  ru: {
    title: "Календарь",
    subtitle: "Смены, задачи, встречи и рабочие события сотрудников в одном календаре",
    tabs: {
      schedules: "Календарь",
      requests: "Запросы",
      changelog: "Журнал изменений",
    },
    createShift: "Создать смену",
    massAssign: "Массовое назначение",
    templates: "Шаблоны",
    search: "Поиск...",
    filters: "Фильтры",
    reset: "Сбросить",
    employees: "Сотрудники",
    locations: "Локации",
    departments: "Отделы",
    roles: "Роли",
    allEmployees: "Все сотрудники",
    allLocations: "Все локации",
    allDepartments: "Все отделы",
    allRoles: "Все роли",
    eventTypes: "Тип событий",
    allEventTypes: "Все события",
    shiftsOnly: "Смены",
    tasksOnly: "Задачи",
    meetingsOnly: "Встречи",
    noDepartment: "Без отдела",
    noRole: "Без роли",
    shifts: "смен",
    tasksShort: "задач",
    meetingsShort: "встреч",
    peopleShort: "чел.",
    noShifts: "Нет смен",
    noCalendarItems: "Нет событий",
    more: "ещё",
    period: "Период",
    graceMinutes: "Льготные минуты",
    minutesShort: "мин",
    scheduleLoadedFromMock: "Показаны демонстрационные данные.",
    scheduleLoadError: "Не удалось загрузить расписание.",
    requestApproved: "Запрос одобрен.",
    requestRejected: "Запрос отклонён.",
    requestTypeShiftChange: "Смена графика",
    requestStatus: {
      PENDING: "Ожидает",
      APPROVED: "Одобрено",
      REJECTED: "Отклонено",
      CANCELLED: "Отменено",
    },
    createShiftValidation: "Выберите сотрудника, шаблон и дату.",
    shiftCreated: "Смена создана.",
    templateValidation: "Укажите название, время смены и рабочие дни.",
    templateCreated: "Шаблон смены создан.",
    noShiftTemplates: "Нет шаблонов смен",
    massAssignValidation: "Выберите шаблон и диапазон дат.",
    templateNotFound: "Шаблон не найден.",
    templateDefaultsMissing: "Сначала настройте хотя бы одну локацию и должность.",
    invalidRange: "Проверьте диапазон дат для массового назначения.",
    noEligibleEmployees: "Под выбранный шаблон не найдено подходящих сотрудников.",
    massAssignCreated: (count: number) => `Создано ${count} назначений по шаблону.`,
    requestsEmpty: "Нет запросов на изменение графика.",
    changelogEmpty: "Журнал изменений пока пуст.",
    loading: "Загружаю расписание...",
    dayHeaders: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    createdShift: "Создана смена",
    createdTemplate: "Создан шаблон",
    createShiftDialogTitle: "Создать смену",
    createShiftDialogDescription: "Назначьте сотрудника на конкретную дату по одному из шаблонов.",
    employee: "Сотрудник",
    selectEmployee: "Выберите сотрудника",
    shiftTemplate: "Шаблон смены",
    selectTemplate: "Выберите шаблон",
    date: "Дата",
    saveShift: "Сохранить смену",
    templatesDialogTitle: "Шаблоны смен",
    templatesDialogDescription: "Список действующих шаблонов и форма для создания нового.",
    newTemplate: "Новый шаблон",
    templateName: "Название шаблона",
    templateCode: "Код шаблона",
    chooseLocation: "Локация",
    chooseRole: "Роль",
    templateDays: "Рабочие дни",
    templateDaysHint: "Выберите, в какие дни работает этот шаблон.",
    createTemplateAction: "Создать шаблон",
    massAssignDialogTitle: "Массовое назначение",
    massAssignDialogDescription: "Назначает один шаблон всем подходящим сотрудникам в выбранном диапазоне дат.",
    assignShifts: "Назначить смены",
    dayDialogShifts: "смен",
    dayDialogEmployees: "сотрудников",
    dayDialogEvents: "событий",
    noDayShifts: "На этот день смен пока нет.",
    noDayEvents: "На этот день событий пока нет.",
    addShiftForDay: "Добавить смену на день",
    time: "Время",
    location: "Локация",
    template: "Шаблон",
    task: "Задача",
    meeting: "Встреча",
    shift: "Смена",
    doneAt: (time: string) => `Выполнена в ${time}`,
    notDone: "Не выполнена",
    viewPhotos: (count: number) => (count === 1 ? "Фото" : `${count} фото`),
    photoProofs: "Фотоотчёты",
    photoProofsDescription: "Все фотографии, приложенные к выполнению этой задачи.",
    details: "Открыть детали",
    approve: "Одобрить",
    reject: "Отклонить",
  },
  en: {
    title: "Calendar",
    subtitle: "Shifts, tasks, meetings, and workforce events in one calendar",
    tabs: {
      schedules: "Calendar",
      requests: "Requests",
      changelog: "Change log",
    },
    createShift: "Create shift",
    massAssign: "Bulk assign",
    templates: "Templates",
    search: "Search...",
    filters: "Filters",
    reset: "Reset",
    employees: "Employees",
    locations: "Locations",
    departments: "Departments",
    roles: "Roles",
    allEmployees: "All employees",
    allLocations: "All locations",
    allDepartments: "All departments",
    allRoles: "All roles",
    eventTypes: "Event type",
    allEventTypes: "All events",
    shiftsOnly: "Shifts",
    tasksOnly: "Tasks",
    meetingsOnly: "Meetings",
    noDepartment: "No department",
    noRole: "No role",
    shifts: "shifts",
    tasksShort: "tasks",
    meetingsShort: "meetings",
    peopleShort: "people",
    noShifts: "No shifts",
    noCalendarItems: "No events",
    more: "more",
    period: "Period",
    graceMinutes: "Grace minutes",
    minutesShort: "min",
    scheduleLoadedFromMock: "Showing demo data.",
    scheduleLoadError: "Unable to load schedule.",
    requestApproved: "Request approved.",
    requestRejected: "Request rejected.",
    requestTypeShiftChange: "Shift change",
    requestStatus: {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      CANCELLED: "Cancelled",
    },
    createShiftValidation: "Select an employee, template, and date.",
    shiftCreated: "Shift created.",
    templateValidation: "Fill in the name, shift time, and workdays.",
    templateCreated: "Shift template created.",
    noShiftTemplates: "No shift templates",
    massAssignValidation: "Select a template and date range.",
    templateNotFound: "Template not found.",
    templateDefaultsMissing: "Set up at least one location and one role first.",
    invalidRange: "Check the date range for bulk assignment.",
    noEligibleEmployees: "No matching employees were found for this template.",
    massAssignCreated: (count: number) => `Created ${count} assignments from the template.`,
    requestsEmpty: "No schedule change requests.",
    changelogEmpty: "Change log is empty.",
    loading: "Loading schedule...",
    dayHeaders: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    createdShift: "Shift created",
    createdTemplate: "Template created",
    createShiftDialogTitle: "Create shift",
    createShiftDialogDescription: "Assign an employee to a date using one of the templates.",
    employee: "Employee",
    selectEmployee: "Select employee",
    shiftTemplate: "Shift template",
    selectTemplate: "Select template",
    date: "Date",
    saveShift: "Save shift",
    templatesDialogTitle: "Shift templates",
    templatesDialogDescription: "Active templates and a form to create a new one.",
    newTemplate: "New template",
    templateName: "Template name",
    templateCode: "Template code",
    chooseLocation: "Location",
    chooseRole: "Role",
    templateDays: "Workdays",
    templateDaysHint: "Choose which weekdays this template should create shifts for.",
    createTemplateAction: "Create template",
    massAssignDialogTitle: "Bulk assignment",
    massAssignDialogDescription: "Assign one template to all matching employees in the selected date range.",
    assignShifts: "Assign shifts",
    dayDialogShifts: "shifts",
    dayDialogEmployees: "employees",
    dayDialogEvents: "events",
    noDayShifts: "No shifts planned for this day.",
    noDayEvents: "No events planned for this day.",
    addShiftForDay: "Add shift for this day",
    time: "Time",
    location: "Location",
    template: "Template",
    task: "Task",
    meeting: "Meeting",
    shift: "Shift",
    doneAt: (time: string) => `Done at ${time}`,
    notDone: "Not done",
    viewPhotos: (count: number) => (count === 1 ? "Photo" : `${count} photos`),
    photoProofs: "Photo proofs",
    photoProofsDescription: "All photos attached to this completed task.",
    details: "Open details",
    approve: "Approve",
    reject: "Reject",
  },
} as const;

export default function Schedule({
  initialData,
  mode = "admin",
}: {
  initialData?: ScheduleInitialData | null;
  mode?: "admin" | "employee";
}) {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const ui = scheduleCopy[locale];
  const localeTag = locale === "ru" ? "ru-RU" : "en-US";
  const session = getSession();
  const sessionAccessToken = session?.accessToken ?? null;
  const sessionRoleKey = session?.user.roleCodes.join(",") ?? "";
  const isDemoSession = isDemoAccessToken(sessionAccessToken);
  const isEmployeeMode =
    mode === "employee" || isEmployeeOnlyRole(session?.user.roleCodes ?? []);
  const today = useMemo(() => new Date(), []);
  const [isMockMode, setIsMockMode] = useState(initialData?.isMockMode ?? false);
  const [activeTab, setActiveTab] = useState<TabKey>("schedules");
  const [period] = useState<PeriodMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [collapsedDayEntryIds, setCollapsedDayEntryIds] = useState<Set<string>>(new Set());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [calendarEventFilter, setCalendarEventFilter] =
    useState<CalendarEventFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeApiRecord[]>(
    initialData?.employees ?? [],
  );
  const [locations, setLocations] = useState<Option[]>(initialData?.locations ?? []);
  const [departments, setDepartments] = useState<Option[]>(
    initialData?.departments ?? [],
  );
  const [positions, setPositions] = useState<Option[]>(initialData?.positions ?? []);
  const [templates, setTemplates] = useState<ShiftTemplateRecord[]>(
    initialData?.templates ?? [],
  );
  const [shifts, setShifts] = useState<ShiftRecord[]>(initialData?.shifts ?? []);
  const [requests, setRequests] = useState<ApprovalInboxItem[]>(
    initialData?.requests ?? [],
  );
  const [taskBoard, setTaskBoard] =
    useState<CollaborationTaskBoardResponse | null>(initialData?.taskBoard ?? null);
  const [attendanceHistory, setAttendanceHistory] =
    useState<AttendanceHistoryResponse | null>(null);
  const [photoProofDialogTask, setPhotoProofDialogTask] = useState<{
    title: string;
    proofs: { id: string; url: string }[];
  } | null>(null);
  const { getTaskBody, getTaskTitle } = useTranslatedTaskCopy(
    taskBoard?.tasks ?? [],
    locale,
  );
  const didUseInitialData = useRef(Boolean(initialData));

  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [massAssignOpen, setMassAssignOpen] = useState(false);

  const [createShiftDraft, setCreateShiftDraft] = useState<CreateShiftDraft>({
    employeeId: "",
    templateId: "",
    shiftDate: formatDateInput(today),
  });
  const [templateDraft, setTemplateDraft] =
    useState<CreateTemplateDraft>(initialTemplateDraft);
  const [massAssignDraft, setMassAssignDraft] = useState<MassAssignDraft>({
    templateId: "",
    dateFrom: formatDateInput(today),
    dateTo: formatDateInput(addDays(today, 6)),
    departmentId: "all",
    locationId: "all",
    roleId: "all",
  });

  function toggleTemplateWeekDay(day: number) {
    setTemplateDraft((current) => {
      const nextDays = current.weekDays.includes(day)
        ? current.weekDays.filter((value) => value !== day)
        : [...current.weekDays, day].sort((left, right) => left - right);

      return {
        ...current,
        weekDays: nextDays,
      };
    });
  }

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Calendar }> = [
    { key: "schedules", label: ui.tabs.schedules, icon: Calendar },
    { key: "requests", label: ui.tabs.requests, icon: FileText },
    { key: "changelog", label: ui.tabs.changelog, icon: History },
  ];

  const calendarDays = useMemo(
    () => buildCalendarDays(currentDate, period),
    [currentDate, period],
  );
  const historicalRange = useMemo(() => {
    const visibleStart = calendarDays[0];
    const visibleEnd = calendarDays[calendarDays.length - 1];

    if (!visibleStart || !visibleEnd) {
      return null;
    }

    const yesterday = addDays(startOfDayLocal(today), -1);
    const normalizedStart = startOfDayLocal(visibleStart);
    const normalizedEnd = startOfDayLocal(visibleEnd);

    if (normalizedStart.getTime() > yesterday.getTime()) {
      return null;
    }

    const resolvedEnd =
      normalizedEnd.getTime() < yesterday.getTime() ? normalizedEnd : yesterday;

    return {
      dateFrom: formatDateInput(normalizedStart),
      dateTo: formatDateInput(resolvedEnd),
    };
  }, [calendarDays, today]);

  const selectedEmployee = useMemo(
    () =>
      selectedEmployeeId === "all"
        ? null
        : employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const employeeById = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.id,
          {
            departmentId: employee.department?.id ?? null,
            departmentName: employee.department?.name ?? ui.noDepartment,
            roleId: employee.position?.id ?? null,
            roleName: employee.position?.name ?? ui.noRole,
            employeeNumber: employee.employeeNumber,
            avatarSrc:
              employee.avatarUrl ||
              getMockAvatarDataUrl(
                buildEmployeeName(employee) || employee.lastName || employee.id,
              ),
          },
        ]),
      ),
    [employees, ui.noDepartment, ui.noRole],
  );

  const enrichedShifts = useMemo<EnrichedShift[]>(
    () =>
      shifts.map((shift) => {
        const employeeMeta = employeeById.get(shift.employee.id);
        const employeeName = buildEmployeeName(shift.employee);
        return {
          id: shift.id,
          employeeId: shift.employee.id,
          employeeName,
          employeeNumber: employeeMeta?.employeeNumber ?? "",
          avatarSrc:
            employeeMeta?.avatarSrc || getMockAvatarDataUrl(employeeName || shift.id),
          shiftDate: parseIsoDate(shift.shiftDate),
          startsAtDate: parseIsoDate(shift.startsAt),
          endsAtDate: parseIsoDate(shift.endsAt),
          startsAt: formatTime(parseIsoDate(shift.startsAt), localeTag),
          endsAt: formatTime(parseIsoDate(shift.endsAt), localeTag),
          templateName: shift.template.name,
          templateStartsAtLocal: shift.template.startsAtLocal,
          templateEndsAtLocal: shift.template.endsAtLocal,
          locationId: shift.location.id,
          locationName: shift.location.name,
          departmentId: employeeMeta?.departmentId ?? null,
          departmentName: employeeMeta?.departmentName ?? ui.noDepartment,
          roleId: employeeMeta?.roleId ?? shift.position.id,
          roleName: employeeMeta?.roleName ?? shift.position.name,
          createdAt: shift.createdAt,
          updatedAt: shift.updatedAt,
        };
      }),
    [employeeById, shifts, localeTag, ui.noDepartment],
  );

  const visibleShifts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enrichedShifts.filter((shift) => {
      if (selectedEmployeeId !== "all" && shift.employeeId !== selectedEmployeeId) {
        return false;
      }
      if (locationFilter !== "all" && shift.locationId !== locationFilter) {
        return false;
      }
      if (departmentFilter !== "all" && shift.departmentId !== departmentFilter) {
        return false;
      }
      if (roleFilter !== "all" && shift.roleId !== roleFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [
        shift.employeeName,
        shift.employeeNumber,
        shift.locationName,
        shift.departmentName,
        shift.roleName,
        shift.templateName,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [
    departmentFilter,
    enrichedShifts,
    locationFilter,
    roleFilter,
    search,
    selectedEmployeeId,
  ]);

  const visibleTaskEvents = useMemo<CalendarTaskEvent[]>(() => {
    const query = search.trim().toLowerCase();

    return (taskBoard?.tasks ?? [])
      .filter((task) => task.dueAt)
      .map((task) => {
        const meta = parseTaskMeta(task.description);
        const dueAt = parseIsoDate(task.dueAt as string);
        const assigneeName = task.assigneeEmployee
          ? buildEmployeeName(task.assigneeEmployee)
          : task.group?.name ?? "—";
        const location = task.assigneeEmployee?.primaryLocation?.name ?? "—";
        const department = task.assigneeEmployee?.department?.name ?? ui.noDepartment;
        const role = "position" in (task.assigneeEmployee ?? {})
          ? ((task.assigneeEmployee as unknown as { position?: { name?: string } | null }).position?.name ?? ui.noRole)
          : ui.noRole;
        const isMeeting = Boolean(meta.meeting) || /^(встреча|meeting):/i.test(task.title);
        const kind: CalendarTaskEvent["kind"] = isMeeting ? "meeting" : "task";

        return {
          id: task.id,
          isDone: task.status === "DONE",
          kind,
          title: isMeeting
            ? getTaskTitle(task, { stripMeetingPrefix: true })
            : getTaskTitle(task),
          description: getTaskBody(task),
          date: dueAt,
          time: formatTime(dueAt, localeTag),
          completedAt: task.completedAt ?? (task.status === "DONE" ? task.updatedAt : null),
          employeeId: task.assigneeEmployeeId,
          assigneeName,
          employeeNumber: task.assigneeEmployee?.employeeNumber ?? "",
          locationId: task.assigneeEmployee?.primaryLocation?.id ?? null,
          locationName: location,
          departmentId: task.assigneeEmployee?.department?.id ?? null,
          departmentName: department,
          photoProofs: getActivePhotoProofs(task).map((proof) => ({
            id: proof.id,
            url: proof.url,
          })),
          requiresPhoto: task.requiresPhoto,
          roleId: null,
          roleName: role,
        };
      })
      .filter((event) => {
        if (selectedEmployeeId !== "all" && event.employeeId !== selectedEmployeeId) {
          return false;
        }
        if (locationFilter !== "all" && event.locationId !== locationFilter) {
          return false;
        }
        if (departmentFilter !== "all" && event.departmentId !== departmentFilter) {
          return false;
        }
        if (roleFilter !== "all" && event.roleId !== roleFilter) {
          return false;
        }
        if (calendarEventFilter === "tasks" && event.kind !== "task") {
          return false;
        }
        if (calendarEventFilter === "meetings" && event.kind !== "meeting") {
          return false;
        }
        if (!query) {
          return true;
        }

        return [
          event.title,
          event.description,
          event.assigneeName,
          event.employeeNumber,
          event.locationName,
          event.departmentName,
          event.roleName,
        ].some((value) => (value ?? "").toLowerCase().includes(query));
      });
  }, [
    calendarEventFilter,
    departmentFilter,
    localeTag,
    locationFilter,
    roleFilter,
    search,
    selectedEmployeeId,
    getTaskBody,
    getTaskTitle,
    taskBoard?.tasks,
    ui.noDepartment,
    ui.noRole,
  ]);

  const attendanceHistoryByEmployeeDay = useMemo(() => {
    const map = new Map<string, AttendanceHistoryRow[]>();

    for (const row of attendanceHistory?.rows ?? []) {
      const key = buildAttendanceHistoryKey(
        row.employeeId,
        startOfDayLocal(parseIsoDate(row.startedAt)),
      );
      const rows = map.get(key) ?? [];
      rows.push(row);
      map.set(key, rows);
    }

    return map;
  }, [attendanceHistory]);

  const periodShifts = useMemo(() => {
    const keys = new Set(calendarDays.map((day: Date) => formatDateInput(day)));
    return visibleShifts.filter((shift) =>
      keys.has(formatDateInput(shift.shiftDate)),
    );
  }, [calendarDays, visibleShifts]);

  const periodTaskEvents = useMemo(() => {
    const keys = new Set(calendarDays.map((day: Date) => formatDateInput(day)));
    return visibleTaskEvents.filter((event) =>
      keys.has(formatDateInput(event.date)),
    );
  }, [calendarDays, visibleTaskEvents]);

  const shiftsForDay = (day: Date) =>
    periodShifts
      .filter((shift) => isSameDayLocal(shift.shiftDate, day))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  const taskEventsForDay = (day: Date) =>
    periodTaskEvents
      .filter((event) => isSameDayLocal(event.date, day))
      .sort((left, right) => left.time.localeCompare(right.time));

  const calendarEntriesForDay = (day: Date): CalendarDayEntry[] => {
    const isPastDay = startOfDayLocal(day).getTime() < startOfDayLocal(today).getTime();
    const useHistoricalShiftEntries = isPastDay && attendanceHistory !== null;
    const groupedShiftEntries: CalendarDayEntry[] =
      calendarEventFilter === "all" || calendarEventFilter === "shifts"
        ? useHistoricalShiftEntries
          ? shiftsForDay(day).map((shift) => {
              const plannedShiftRange = buildPlannedShiftRange(
                day,
                shift.templateStartsAtLocal,
                shift.templateEndsAtLocal,
              );
              const attendanceSummary = buildAttendanceSummary(
                attendanceHistoryByEmployeeDay.get(
                  buildAttendanceHistoryKey(shift.employeeId, startOfDayLocal(day)),
                ) ?? [],
                locale,
                {
                  plannedStartsAt: plannedShiftRange.startsAt,
                  plannedEndsAt: plannedShiftRange.endsAt,
                },
              );
              const plannedShiftTime = `${shift.startsAt}-${shift.endsAt}`;

              return {
                id: `shift-${shift.id}`,
                kind: "shift" as const,
                time: attendanceSummary.isAbsent
                  ? plannedShiftTime
                  : attendanceSummary.label,
                sortTime: shift.startsAt,
                title: shift.employeeName,
                subtitle: shift.templateName,
                statusTone: attendanceSummary.tone,
                employeeId: shift.employeeId,
                employeeIds: [shift.employeeId],
                peopleCount: 1,
                previewLabel: shift.employeeName,
                detailItems: [
                  {
                    avatarSrc: shift.avatarSrc,
                    employeeId: shift.employeeId,
                    id: shift.id,
                    title: shift.employeeName,
                    subtitle: shift.roleName || "",
                    statusLabel: attendanceSummary.label,
                    statusPlacement: attendanceSummary.isAbsent ? "inline" : "badge",
                    statusTone: attendanceSummary.tone,
                    metaLabel: attendanceSummary.metaLabel ?? undefined,
                  },
                ],
              };
            })
          : Array.from(
              shiftsForDay(day).reduce<
                Map<
                  string,
                  {
                    detailItems: CalendarDayEntryDetail[];
                    employeeIds: string[];
                    id: string;
                    peopleCount: number;
                    sortTime: string;
                    subtitle: string;
                    time: string;
                    title: string;
                  }
                >
              >((map, shift) => {
                const time = `${shift.startsAt}-${shift.endsAt}`;
                const subtitle = shift.templateName;
                const key = [
                  "shift",
                  time,
                  shift.locationId,
                  shift.templateName.toLowerCase(),
                ].join("|");
                const existing = map.get(key);

                if (existing) {
                  existing.peopleCount += 1;
                  existing.employeeIds.push(shift.employeeId);
                  existing.detailItems.push({
                    avatarSrc: shift.avatarSrc,
                    employeeId: shift.employeeId,
                    id: shift.id,
                    title: shift.employeeName,
                    subtitle: shift.roleName || "",
                  });
                  return map;
                }

                map.set(key, {
                  id: `shift-${shift.id}`,
                  title: time,
                  time,
                  sortTime: shift.startsAt,
                  subtitle,
                  peopleCount: 1,
                  employeeIds: [shift.employeeId],
                  detailItems: [
                    {
                      avatarSrc: shift.avatarSrc,
                      employeeId: shift.employeeId,
                      id: shift.id,
                      title: shift.employeeName,
                      subtitle: shift.roleName || "",
                    },
                  ],
                });
                return map;
              }, new Map()),
            ).map(([, entry]) => ({
              id: entry.id,
              kind: "shift" as const,
              time: entry.time,
              sortTime: entry.sortTime,
              title: entry.title,
              subtitle: entry.subtitle,
              employeeId: entry.employeeIds[0] ?? null,
              employeeIds: entry.employeeIds,
              peopleCount: entry.peopleCount,
              previewLabel:
                entry.peopleCount === 1 ? (entry.detailItems[0]?.title ?? "") : "",
              detailItems: entry.detailItems.sort((left, right) =>
                left.title.localeCompare(right.title, localeTag),
              ),
            }))
        : [];

    const groupedTaskEntries: CalendarDayEntry[] =
      calendarEventFilter === "all" ||
      calendarEventFilter === "tasks" ||
      calendarEventFilter === "meetings"
        ? Array.from(
            taskEventsForDay(day).reduce<
              Map<
                string,
                {
                  detailItems: CalendarDayEntryDetail[];
                  employeeIds: string[];
                  id: string;
                  isDone: boolean;
                  kind: "task" | "meeting";
                  peopleCount: number;
                  subtitle: string;
                  time: string;
                  title: string;
                }
              >
            >((map, event) => {
              const subtitle =
                event.locationName !== "—" ? event.locationName : event.assigneeName;
              const key = [
                event.kind,
                event.isDone ? "done" : "open",
                event.time,
                event.title.toLowerCase(),
                event.locationId ?? event.locationName,
                event.description?.toLowerCase() ?? "",
              ].join("|");
              const existing = map.get(key);

                if (existing) {
                  existing.peopleCount += 1;
                  if (event.employeeId) {
                    existing.employeeIds.push(event.employeeId);
                  }
                  existing.detailItems.push({
                    avatarSrc:
                      (event.employeeId ? employeeById.get(event.employeeId)?.avatarSrc : null) ||
                      getMockAvatarDataUrl(event.assigneeName || event.id),
                    employeeId: event.employeeId,
                    id: event.id,
                    title: event.assigneeName,
                    subtitle: event.roleName || "",
                    statusLabel:
                      event.kind === "task"
                        ? event.isDone && event.completedAt
                          ? ui.doneAt(formatTime(parseIsoDate(event.completedAt), localeTag))
                          : ui.notDone
                        : undefined,
                    statusTone:
                      event.kind === "task"
                        ? event.isDone
                          ? "success"
                          : isPastDay
                            ? "error"
                            : "gray"
                        : undefined,
                    metaLabel:
                      event.locationName !== "—" ? event.locationName : undefined,
                    photoProofs: event.photoProofs,
                  });
                  return map;
                }

              map.set(key, {
                id: event.id,
                isDone: event.isDone,
                kind: event.kind,
                title: event.title,
                time: event.time,
                subtitle,
                peopleCount: 1,
                employeeIds: event.employeeId ? [event.employeeId] : [],
                detailItems: [
                  {
                    avatarSrc:
                      (event.employeeId ? employeeById.get(event.employeeId)?.avatarSrc : null) ||
                      getMockAvatarDataUrl(event.assigneeName || event.id),
                    employeeId: event.employeeId,
                    id: event.id,
                    title: event.assigneeName,
                    subtitle: event.roleName || "",
                    statusLabel:
                      event.kind === "task"
                        ? event.isDone && event.completedAt
                          ? ui.doneAt(formatTime(parseIsoDate(event.completedAt), localeTag))
                          : ui.notDone
                        : undefined,
                    statusTone:
                      event.kind === "task"
                        ? event.isDone
                          ? "success"
                          : isPastDay
                            ? "error"
                            : "gray"
                        : undefined,
                    metaLabel:
                      event.locationName !== "—" ? event.locationName : undefined,
                    photoProofs: event.photoProofs,
                  },
                ],
              });
              return map;
            }, new Map()),
          ).map(([, entry]) => ({
            id: entry.id,
            isDone: entry.isDone,
            kind: entry.kind,
            time: entry.time,
            sortTime: entry.time,
            title: entry.title,
            subtitle: entry.subtitle,
            employeeId: entry.employeeIds[0] ?? null,
            employeeIds: entry.employeeIds,
            peopleCount: entry.peopleCount,
            previewLabel: entry.title,
            statusTone:
              entry.kind === "task"
                ? entry.isDone
                  ? "success"
                  : isPastDay
                    ? "error"
                    : "gray"
                : undefined,
            detailItems: entry.detailItems.sort((left, right) =>
              left.title.localeCompare(right.title, localeTag),
            ),
          }))
        : [];

    return [...groupedShiftEntries, ...groupedTaskEntries].sort((left, right) => {
      const leftDone = left.isDone ? 1 : 0;
      const rightDone = right.isDone ? 1 : 0;

      return (
        leftDone - rightDone ||
        left.sortTime.localeCompare(right.sortTime) ||
        left.title.localeCompare(right.title, localeTag)
      );
    });
  };

  const scheduleRequests = useMemo(
    () =>
      requests
        .filter((item) => item.request.requestType === "SHIFT_CHANGE")
        .sort((left, right) =>
          right.request.startsOn.localeCompare(left.request.startsOn),
        ),
    [requests],
  );

  const changeLog = useMemo<ChangeLogEntry[]>(() => {
    const shiftEntries = enrichedShifts.map((shift) => ({
      id: `shift-${shift.id}`,
      action: ui.createdShift,
      target: `${shift.employeeName} · ${formatDateTime(shift.shiftDate, {
        day: "numeric",
        month: "long",
      }, localeTag)} · ${shift.startsAt}-${shift.endsAt}`,
      occurredAt: shift.createdAt,
      meta: `${shift.locationName} · ${shift.templateName}`,
    }));

    const templateEntries = templates.map((template) => ({
      id: `template-${template.id}`,
      action: ui.createdTemplate,
      target: `${template.name} · ${template.startsAtLocal}-${template.endsAtLocal}`,
      occurredAt: template.createdAt,
      meta: `${template.location.name} · ${template.position.name}`,
    }));

    const taskEntries = visibleTaskEvents.map((event) => ({
      id: `task-${event.id}`,
      action: event.kind === "meeting" ? ui.meeting : ui.task,
      target: `${event.title} · ${event.assigneeName}`,
      occurredAt: event.date.toISOString(),
      meta: `${event.time}${event.locationName !== "—" ? ` · ${event.locationName}` : ""}`,
    }));

    return [...shiftEntries, ...templateEntries, ...taskEntries]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 20);
  }, [enrichedShifts, templates, ui.createdShift, ui.createdTemplate, localeTag, visibleTaskEvents, ui.meeting, ui.task]);

  async function loadData(options?: { force?: boolean; silent?: boolean }) {
    const visibleStart = calendarDays[0];
    const visibleEnd = calendarDays[calendarDays.length - 1];
    const bootstrapQuery = new URLSearchParams({
      dateFrom: formatDateInput(visibleStart),
      dateTo: formatDateInput(visibleEnd),
    }).toString();

    if (!session) {
      const mock = createMockScheduleData(new Date(), locale);
      setTemplates(mock.templates);
      setShifts(mock.shifts);
      setEmployees(mock.employees);
      setLocations(mock.locations);
      setDepartments(mock.departments);
      setPositions(mock.positions);
      setRequests(mock.requests);
      setTaskBoard({
        tasks: [],
        totals: { total: 0, overdue: 0, active: 0, done: 0 },
      });
      setIsMockMode(true);
      setMessage(ui.scheduleLoadedFromMock);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setMessage(null);
    }

    try {
      const snapshot = await apiRequest<ManagerScheduleBootstrapResponse>(
        `/bootstrap/schedule?${bootstrapQuery}`,
        {
          token: session.accessToken,
          skipClientCache: options?.force ?? false,
        },
      );

      if (!snapshot.initialData) {
        throw new Error(ui.scheduleLoadError);
      }

      setIsMockMode(false);
      setTemplates(snapshot.initialData.templates);
      setShifts(snapshot.initialData.shifts);
      setEmployees(snapshot.initialData.employees);
      setLocations(snapshot.initialData.locations);
      setDepartments(snapshot.initialData.departments);
      setPositions(snapshot.initialData.positions);
      setRequests(snapshot.initialData.requests);
      setTaskBoard(snapshot.initialData.taskBoard);
      setMessage(null);
      return;
    } catch (error) {
      if (!options?.silent) {
        setTemplates([]);
        setShifts([]);
        setEmployees([]);
        setLocations([]);
        setDepartments([]);
        setPositions([]);
        setRequests([]);
        setTaskBoard(null);
        setIsMockMode(false);
        setMessage(
          error instanceof Error
            ? error.message
            : ui.scheduleLoadError,
        );
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (
      didUseInitialData.current &&
      initialData &&
      initialData.mode === (isEmployeeMode ? "employee" : "admin") &&
      initialData.visibleDateFrom === formatDateInput(calendarDays[0]) &&
      initialData.visibleDateTo === formatDateInput(calendarDays[calendarDays.length - 1])
    ) {
      didUseInitialData.current = false;
      setLoading(false);
      setMessage(null);
      return;
    }

    void loadData({ force: true });
  }, [calendarDays, initialData, isEmployeeMode, locale, sessionAccessToken, sessionRoleKey]);

  useWorkspaceAutoRefresh({
    session,
    enabled: Boolean(session),
    onRefresh: async () => {
      await loadData({
        force: true,
        silent: true,
      });
    },
  });

  useEffect(() => {
    if (!sessionAccessToken || !historicalRange) {
      setAttendanceHistory(null);
      return;
    }

    let cancelled = false;
    const query = new URLSearchParams(historicalRange).toString();

    const request = isEmployeeMode
      ? apiRequest<DashboardBootstrapResponse>(`/bootstrap/dashboard?${query}`, {
          token: sessionAccessToken,
        }).then((snapshot) => snapshot.initialData.personalHistory)
      : apiRequest<AttendanceBootstrapResponse>(`/bootstrap/attendance?${query}`, {
          token: sessionAccessToken,
        }).then((snapshot) => snapshot.history);

    void request
      .then((snapshot) => {
        if (!cancelled) {
          setAttendanceHistory(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttendanceHistory(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [historicalRange, isEmployeeMode, sessionAccessToken]);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    const eventTypeParam = searchParams.get("eventType");

    if (dateParam) {
      const nextDate = new Date(`${dateParam}T12:00:00`);
      if (!Number.isNaN(nextDate.getTime())) {
        setCurrentDate(nextDate);
        setSelectedDay(nextDate);
        setActiveTab("schedules");
      }
    }

    if (
      eventTypeParam === "all" ||
      eventTypeParam === "shifts" ||
      eventTypeParam === "tasks" ||
      eventTypeParam === "meetings"
    ) {
      setCalendarEventFilter(eventTypeParam);
      setActiveTab("schedules");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!createShiftOpen) {
      return;
    }

    setCreateShiftDraft((current) => ({
      employeeId:
        current.employeeId || (selectedEmployeeId !== "all" ? selectedEmployeeId : ""),
      templateId: current.templateId,
      shiftDate:
        current.shiftDate || formatDateInput(selectedDay ?? currentDate ?? new Date()),
    }));
  }, [createShiftOpen, currentDate, selectedDay, selectedEmployeeId]);

  const selectedDayEntries = useMemo(
    () => (selectedDay ? calendarEntriesForDay(selectedDay) : []),
    [
      attendanceHistory,
      attendanceHistoryByEmployeeDay,
      calendarEventFilter,
      periodShifts,
      periodTaskEvents,
      selectedDay,
      today,
    ],
  );

  useEffect(() => {
    setCollapsedDayEntryIds(new Set());
  }, [selectedDay]);

  function toggleDayEntry(entryId: string) {
    setCollapsedDayEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  async function handleCreateShift() {
    const session = getSession();
    if (
      !createShiftDraft.employeeId ||
      !createShiftDraft.templateId ||
      !createShiftDraft.shiftDate
    ) {
      setMessage(ui.createShiftValidation);
      return;
    }

    const shiftDate = parseIsoDate(`${createShiftDraft.shiftDate}T00:00:00`);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (Number.isNaN(shiftDate.getTime()) || shiftDate < todayStart) {
      setMessage(
        locale === "ru"
          ? "Нельзя создать смену на прошедшую дату."
          : "You cannot create a shift in the past.",
      );
      return;
    }

    if (!session || isMockMode) {
      const employee = employees.find((item) => item.id === createShiftDraft.employeeId);
      const template = templates.find((item) => item.id === createShiftDraft.templateId);
      if (!employee || !template) {
        setMessage(ui.templateNotFound);
        return;
      }

      const createdAt = new Date().toISOString();
      setShifts((current) => [
        {
          id: `mock-shift-${current.length + 1}`,
          shiftDate: createShiftDraft.shiftDate,
          startsAt: new Date(`${createShiftDraft.shiftDate}T${template.startsAtLocal}:00`).toISOString(),
          endsAt: new Date(`${createShiftDraft.shiftDate}T${template.endsAtLocal}:00`).toISOString(),
          status: "ASSIGNED",
          createdAt,
          updatedAt: createdAt,
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNumber: employee.employeeNumber,
          },
          location: template.location,
          position: template.position,
          template,
        },
        ...current,
      ]);
      setCreateShiftOpen(false);
      setCreateShiftDraft({
        employeeId: selectedEmployeeId !== "all" ? selectedEmployeeId : "",
        templateId: "",
        shiftDate: formatDateInput(selectedDay ?? today),
      });
      setMessage(ui.shiftCreated);
      return;
    }

    try {
      await apiRequest("/schedule/shifts", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify(createShiftDraft),
      });

      setCreateShiftOpen(false);
      setCreateShiftDraft({
        employeeId: selectedEmployeeId !== "all" ? selectedEmployeeId : "",
        templateId: "",
        shiftDate: formatDateInput(selectedDay ?? today),
      });
      setMessage(ui.shiftCreated);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.shiftCreated);
    }
  }

  async function handleCreateTemplate() {
    const session = getSession();
    if (
      !templateDraft.name.trim() ||
      !templateDraft.startsAtLocal ||
      !templateDraft.endsAtLocal ||
      templateDraft.weekDays.length === 0
    ) {
      setMessage(ui.templateValidation);
      return;
    }

    if (!session || isMockMode) {
      const location = locations[0];
      const position = positions[0];
      if (!location || !position) {
        setMessage(ui.templateDefaultsMissing);
        return;
      }
      const generatedCode = buildTemplateCode(templateDraft.name.trim());

      const createdAt = new Date().toISOString();
      setTemplates((current) => [
        {
          id: `mock-template-${current.length + 1}`,
          name: templateDraft.name.trim(),
          code: current.some((item) => item.code === generatedCode)
            ? `${generatedCode}-${current.length + 1}`
            : generatedCode,
          startsAtLocal: templateDraft.startsAtLocal,
          endsAtLocal: templateDraft.endsAtLocal,
          weekDaysJson: JSON.stringify(templateDraft.weekDays),
          gracePeriodMinutes: 10,
          createdAt,
          updatedAt: createdAt,
          location,
          position,
        },
        ...current,
      ]);
      setTemplateDraft(initialTemplateDraft);
      setMessage(ui.templateCreated);
      return;
    }

    try {
      const location = locations[0];
      const position = positions[0];
      if (!location || !position) {
        setMessage(ui.templateDefaultsMissing);
        return;
      }

      await apiRequest("/schedule/templates", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: templateDraft.name.trim(),
          code: buildTemplateCode(templateDraft.name.trim()),
          locationId: location.id,
          positionId: position.id,
          startsAtLocal: templateDraft.startsAtLocal,
          endsAtLocal: templateDraft.endsAtLocal,
          weekDays: templateDraft.weekDays,
          gracePeriodMinutes: 10,
        }),
      });

      setTemplateDraft(initialTemplateDraft);
      setMessage(ui.templateCreated);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ui.templateCreated);
    }
  }

  async function handleMassAssign() {
    const session = getSession();
    if (
      !massAssignDraft.templateId ||
      !massAssignDraft.dateFrom ||
      !massAssignDraft.dateTo
    ) {
      setMessage(ui.massAssignValidation);
      return;
    }

    const template = templates.find((item) => item.id === massAssignDraft.templateId);
    if (!template) {
      setMessage(ui.templateNotFound);
      return;
    }

    const dates = buildRangeDays(massAssignDraft.dateFrom, massAssignDraft.dateTo);
    if (!dates.length) {
      setMessage(ui.invalidRange);
      return;
    }

    const eligibleEmployees = employees.filter((employee) => {
      if (selectedEmployeeId !== "all" && employee.id !== selectedEmployeeId) {
        return false;
      }
      if (
        massAssignDraft.departmentId !== "all" &&
        employee.department?.id !== massAssignDraft.departmentId
      ) {
        return false;
      }
      if (
        massAssignDraft.locationId !== "all" &&
        employee.primaryLocation?.id !== massAssignDraft.locationId
      ) {
        return false;
      }
      if (
        massAssignDraft.roleId !== "all" &&
        employee.position?.id !== massAssignDraft.roleId
      ) {
        return false;
      }

      return employee.position?.id === template.position.id;
    });

    if (!eligibleEmployees.length) {
      setMessage(ui.noEligibleEmployees);
      return;
    }

    if (!session || isMockMode) {
      const createdAt = new Date().toISOString();
      const createdShifts = dates.flatMap((date, index) =>
        eligibleEmployees.map((employee, employeeIndex) => ({
          id: `mock-bulk-${employee.id}-${index}-${employeeIndex}`,
          shiftDate: formatDateInput(date),
          startsAt: new Date(`${formatDateInput(date)}T${template.startsAtLocal}:00`).toISOString(),
          endsAt: new Date(`${formatDateInput(date)}T${template.endsAtLocal}:00`).toISOString(),
          status: "ASSIGNED",
          createdAt,
          updatedAt: createdAt,
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeNumber: employee.employeeNumber,
          },
          location: template.location,
          position: template.position,
          template,
        })),
      );

      setShifts((current) => [...createdShifts, ...current]);
      setMassAssignOpen(false);
      setMessage(ui.massAssignCreated(createdShifts.length));
      return;
    }

    try {
      await Promise.all(
        dates.flatMap((date) =>
          eligibleEmployees.map((employee) =>
            apiRequest("/schedule/shifts", {
              method: "POST",
              token: session.accessToken,
              body: JSON.stringify({
                templateId: template.id,
                employeeId: employee.id,
                shiftDate: formatDateInput(date),
              }),
            }),
          ),
        ),
      );

      setMassAssignOpen(false);
      setMessage(ui.massAssignCreated(dates.length * eligibleEmployees.length));
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : ui.massAssignValidation,
      );
    }
  }

  async function handleRequestAction(
    requestId: string,
    action: "approve" | "reject",
  ) {
    const session = getSession();
    setRequestActionId(requestId);
    if (!session || isMockMode) {
      setRequests((current) =>
        current.map((item) =>
          item.request.id === requestId
            ? {
                ...item,
                status: action === "approve" ? "APPROVED" : "REJECTED",
                request: {
                  ...item.request,
                  status: action === "approve" ? "APPROVED" : "REJECTED",
                  approvalSteps: item.request.approvalSteps.map((step) =>
                    step.sequence === item.sequence
                      ? {
                          ...step,
                          status: action === "approve" ? "APPROVED" : "REJECTED",
                          actedAt: new Date().toISOString(),
                        }
                      : step,
                  ),
                },
              }
            : item,
        ),
      );
      setMessage(action === "approve" ? ui.requestApproved : ui.requestRejected);
      setRequestActionId(null);
      return;
    }

    try {
      await apiRequest(`/requests/${requestId}/${action}`, {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({ comment: "" }),
      });

      setMessage(action === "approve" ? ui.requestApproved : ui.requestRejected);
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : ui.requestRejected,
      );
    } finally {
      setRequestActionId(null);
    }
  }

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack min-h-0 overflow-y-auto scrollbar-hide">
          <section className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {!isEmployeeMode && activeTab !== "schedules" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="font-heading"
                onClick={() => setCreateShiftOpen(true)}
                size="lg"
                type="button"
              >
                <Plus className="size-4" />
                {ui.createShift}
              </Button>
              <Button
                className="font-heading"
                onClick={() => setMassAssignOpen(true)}
                size="lg"
                type="button"
                variant="outline"
              >
                {ui.massAssign}
              </Button>
              <Button
                className="font-heading"
                onClick={() => setTemplatesOpen(true)}
                size="lg"
                type="button"
                variant="outline"
              >
                {ui.templates}
              </Button>
            </div>
            ) : null}
          </div>

          {!isEmployeeMode && activeTab !== "schedules" ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  className={`filter-chip ${
                    activeTab === tab.key
                      ? "filter-chip-active"
                      : "filter-chip-inactive"
                  }`}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

        </section>

        {activeTab === "schedules" ? (
          <>
            <div className="schedule-calendar-toolbar mb-5">
              <div className="schedule-calendar-heading">
                <h2>
                  {formatCalendarLabel(currentDate, period, calendarDays, localeTag)}
                </h2>
                <div className="schedule-calendar-nav">
                  <button
                    className="schedule-calendar-nav-button"
                    onClick={() => setCurrentDate((current) => subMonths(current, 1))}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    className="schedule-calendar-nav-button"
                    onClick={() => setCurrentDate((current) => addMonths(current, 1))}
                    type="button"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <div className="schedule-calendar-actions">
                {!isEmployeeMode ? (
                  <div className="schedule-calendar-primary-actions">
                    <Button
                      className="font-heading"
                      onClick={() => setCreateShiftOpen(true)}
                      size="lg"
                      type="button"
                    >
                      <Plus className="size-4" />
                      {ui.createShift}
                    </Button>
                    <Button
                      className="font-heading"
                      onClick={() => setMassAssignOpen(true)}
                      size="lg"
                      type="button"
                      variant="outline"
                    >
                      {ui.massAssign}
                    </Button>
                    <Button
                      className="font-heading"
                      onClick={() => setTemplatesOpen(true)}
                      size="lg"
                      type="button"
                      variant="outline"
                    >
                      {ui.templates}
                    </Button>
                  </div>
                ) : null}

                <div className="schedule-calendar-secondary-actions">
                  <div className="schedule-event-legend">
                    <div className="schedule-event-legend-items">
                      <span className="schedule-event-legend-chip is-shift">
                        <span className="schedule-event-legend-dot" />
                        {ui.shiftsOnly}
                      </span>
                      <span className="schedule-event-legend-chip is-task">
                        <span className="schedule-event-legend-dot" />
                        {ui.tasksOnly}
                      </span>
                      <span className="schedule-event-legend-chip is-meeting">
                        <span className="schedule-event-legend-dot" />
                        {ui.meetingsOnly}
                      </span>
                    </div>
                  </div>
                  <Button
                    className={`h-8 rounded-xl px-3 text-xs font-heading ${
                      showFilters ? "bg-foreground text-background hover:bg-foreground/90" : ""
                    }`}
                    onClick={() => setShowFilters((current) => !current)}
                    type="button"
                    variant="outline"
                  >
                    <Filter className="size-3.5" />
                    {ui.filters}
                  </Button>
                </div>
              </div>
            </div>

            {showFilters ? (
              <section className="dashboard-card mb-5 animate-fade-in">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex min-w-max flex-nowrap gap-3">
                    {!isEmployeeMode ? (
                    <div className="w-[250px]">
                      <label className="mb-1 block text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {ui.employees}
                      </label>
                      <Select
                        onValueChange={setSelectedEmployeeId}
                        value={selectedEmployeeId}
                      >
                        <SelectTrigger className="min-h-8 h-8 rounded-xl border-border bg-white px-3 shadow-none">
                          <SelectTriggerLabel className="text-xs font-heading font-medium">
                            {selectedEmployee
                              ? buildEmployeeName(selectedEmployee)
                              : ui.allEmployees}
                          </SelectTriggerLabel>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ui.allEmployees}</SelectItem>
                          {employees.map((employee) => {
                            const label = buildEmployeeName(employee);
                            return (
                              <SelectItem key={employee.id} value={employee.id}>
                                <SelectOptionContent>
                                  <SelectOptionAvatar
                                    alt={label}
                                    fallback={getInitials(label)}
                                    src={
                                      employee.avatarUrl ||
                                      getMockAvatarDataUrl(label || employee.id)
                                    }
                                  />
                                  <SelectOptionText>
                                    <SelectOptionTitle>{label}</SelectOptionTitle>
                                    <SelectOptionDescription data-select-description>
                                      {employee.position?.name || ui.employee} ·{" "}
                                      {employee.employeeNumber}
                                    </SelectOptionDescription>
                                  </SelectOptionText>
                                </SelectOptionContent>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    ) : null}

                    {!isEmployeeMode ? (
                    <div className="w-[250px]">
                      <label className="mb-1 block text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {ui.locations}
                      </label>
                      <Select onValueChange={setLocationFilter} value={locationFilter}>
                        <SelectTrigger className="min-h-8 h-8 rounded-xl border-border bg-white px-3 shadow-none">
                          <SelectTriggerLabel className="text-xs font-heading font-medium">
                            {locationFilter === "all"
                              ? ui.allLocations
                              : locations.find((item) => item.id === locationFilter)
                                  ?.name}
                          </SelectTriggerLabel>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ui.allLocations}</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    ) : null}

                    {!isEmployeeMode ? (
                    <div className="w-[250px]">
                      <label className="mb-1 block text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {ui.departments}
                      </label>
                      <Select
                        onValueChange={setDepartmentFilter}
                        value={departmentFilter}
                      >
                        <SelectTrigger className="min-h-8 h-8 rounded-xl border-border bg-white px-3 shadow-none">
                          <SelectTriggerLabel className="text-xs font-heading font-medium">
                            {departmentFilter === "all"
                              ? ui.allDepartments
                              : departments.find(
                                  (item) => item.id === departmentFilter,
                                )?.name}
                          </SelectTriggerLabel>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ui.allDepartments}</SelectItem>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    ) : null}

                    {!isEmployeeMode ? (
                    <div className="w-[250px]">
                      <label className="mb-1 block text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {ui.roles}
                      </label>
                      <Select onValueChange={setRoleFilter} value={roleFilter}>
                        <SelectTrigger className="min-h-8 h-8 rounded-xl border-border bg-white px-3 shadow-none">
                          <SelectTriggerLabel className="text-xs font-heading font-medium">
                            {roleFilter === "all"
                              ? ui.allRoles
                              : positions.find((item) => item.id === roleFilter)?.name}
                          </SelectTriggerLabel>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ui.allRoles}</SelectItem>
                          {positions.map((position) => (
                            <SelectItem key={position.id} value={position.id}>
                              {position.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    ) : null}

                    <div className="w-[220px]">
                      <label className="mb-1 block text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {ui.eventTypes}
                      </label>
                      <Select
                        onValueChange={(value) =>
                          setCalendarEventFilter(value as CalendarEventFilter)
                        }
                        value={calendarEventFilter}
                      >
                        <SelectTrigger className="min-h-8 h-8 rounded-xl border-border bg-white px-3 shadow-none">
                          <SelectTriggerLabel className="text-xs font-heading font-medium">
                            {calendarEventFilter === "all"
                              ? ui.allEventTypes
                              : calendarEventFilter === "shifts"
                                ? ui.shiftsOnly
                                : calendarEventFilter === "tasks"
                                  ? ui.tasksOnly
                                  : ui.meetingsOnly}
                          </SelectTriggerLabel>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{ui.allEventTypes}</SelectItem>
                          <SelectItem value="shifts">{ui.shiftsOnly}</SelectItem>
                          <SelectItem value="tasks">{ui.tasksOnly}</SelectItem>
                          <SelectItem value="meetings">{ui.meetingsOnly}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex w-[140px] items-end">
                      <Button
                        className="h-8 w-full rounded-xl px-3 text-xs font-heading"
                        onClick={() => {
                          setSelectedEmployeeId("all");
                          setLocationFilter("all");
                          setDepartmentFilter("all");
                          setRoleFilter("all");
                          setCalendarEventFilter("all");
                        }}
                        type="button"
                        variant="outline"
                      >
                        {ui.reset}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === "schedules" ? (
          <>
            <section className="overflow-hidden rounded-[30px] border border-border/80 bg-white/78 shadow-[0_18px_50px_rgba(31,38,135,0.08)] backdrop-blur-sm">
              <div className="grid grid-cols-7 border-b border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.84))]">
                {ui.dayHeaders.map((label, index) => {
                  const isLastColumn = index === ui.dayHeaders.length - 1;

                  return (
                    <div
                      className={`py-3 text-center ${isLastColumn ? "" : "border-r border-border/80"}`}
                      key={label}
                    >
                      <span className="text-[10px] font-heading font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayEntries = calendarEntriesForDay(day);
                  const isLastColumn = index % 7 === 6;
                  const isLastRow = index >= calendarDays.length - 7;

                  return (
                    <button
                      className={`flex min-h-[148px] flex-col rounded-none p-2 text-left transition-colors duration-200 ${
                        !isLastColumn ? "border-r border-border/80" : ""
                      } ${!isLastRow ? "border-b border-border/80" : ""} ${
                        isTodayLocal(day)
                          ? "bg-[rgba(74,120,255,0.08)] shadow-[inset_0_0_0_1px_rgba(74,120,255,0.24)]"
                          : "bg-transparent hover:bg-secondary/25"
                      } ${isSameMonthLocal(day, currentDate) ? "" : "opacity-40"}`}
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      type="button"
                    >
                      <div className="mb-1 flex items-start justify-end">
                        <span
                          className={`font-heading text-2xl font-bold leading-none ${
                            isTodayLocal(day) ? "text-[color:var(--accent)]" : "text-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      <div
                        className={`space-y-0.5 ${
                          dayEntries.length === 0
                            ? "flex flex-1 items-center justify-center"
                            : "mt-auto"
                        }`}
                      >
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            className={`flex items-center gap-1.5 truncate text-[11px] font-semibold leading-snug ${
                              entry.kind === "shift"
                                ? getEntryToneTextClass(entry.statusTone) ?? "text-blue-600"
                                : entry.kind === "task"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            } ${entry.isDone ? "opacity-55" : ""}`}
                            key={entry.id}
                          >
                            <span className="truncate">{entry.time}</span>
                            {entry.previewLabel ? (
                              <span
                                className={`truncate font-normal opacity-70 ${
                                  entry.isDone ? "line-through" : ""
                                }`}
                              >
                                {entry.previewLabel}
                              </span>
                            ) : null}
                            {entry.peopleCount > 1 ? (
                              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-white/78 px-1.5 py-0.5 text-[9px] font-semibold text-foreground/75">
                                <Users className="size-2.5" />
                                {entry.peopleCount}
                              </span>
                            ) : null}
                          </div>
                        ))}

                        {dayEntries.length > 3 ? (
                          <p className="text-[9px] font-heading text-muted-foreground">
                            +{dayEntries.length - 3} {ui.more}
                          </p>
                        ) : null}

                        {dayEntries.length === 0 ? (
                          <p className="text-center text-[9px] font-heading italic text-muted-foreground/50">
                            {ui.noCalendarItems}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "requests" ? (
          <section className="space-y-3">
            {scheduleRequests.length ? (
              scheduleRequests.map((item) => {
                const employeeName = buildEmployeeName(item.request.employee);
                const busy = requestActionId === item.request.id;
                return (
                  <article className="dashboard-card" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <img
                          alt={employeeName}
                          className="size-12 rounded-full object-cover"
                          src={getMockAvatarDataUrl(employeeName || item.request.id)}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-heading text-lg font-bold text-foreground">
                              {item.request.title}
                            </h2>
                            <span className="rounded-full bg-[color:var(--soft-accent)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-strong)]">
                              {(item.request.requestType === "SHIFT_CHANGE"
                                ? ui.requestTypeShiftChange
                                : item.request.requestType) ||
                                item.request.requestType}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                requestStatusClasses[item.status] ||
                                "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {ui.requestStatus[item.status as keyof typeof ui.requestStatus] || item.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {employeeName} · {item.request.employee.employeeNumber}
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            {item.request.reason || "—"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {ui.period}:{" "}
                            {formatDateTime(parseIsoDate(item.request.startsOn), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }, localeTag)}{" "}
                            -{" "}
                            {formatDateTime(parseIsoDate(item.request.endsOn), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }, localeTag)}
                          </p>
                        </div>
                      </div>

                      {item.status === "PENDING" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void handleRequestAction(item.request.id, "approve")
                            }
                            type="button"
                            variant="secondary"
                          >
                            {ui.approve}
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void handleRequestAction(item.request.id, "reject")
                            }
                            type="button"
                            variant="outline"
                          >
                            {ui.reject}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <section className="dashboard-card text-center">
                <p className="text-sm text-muted-foreground">
                  {ui.requestsEmpty}
                </p>
              </section>
            )}
          </section>
        ) : null}

        {activeTab === "changelog" ? (
          <section className="dashboard-card">
            {changeLog.length ? (
              <div className="space-y-0">
                {changeLog.map((entry, index) => (
                  <article
                    className={`flex flex-wrap items-start justify-between gap-3 py-4 ${
                      index ? "border-t border-border" : ""
                    }`}
                    key={entry.id}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--accent)]">
                        {entry.action}
                      </p>
                      <h2 className="mt-1 font-heading text-lg font-bold text-foreground">
                        {entry.target}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.meta}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>
                          {formatDateTime(parseIsoDate(entry.occurredAt), {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }, localeTag)}
                        </p>
                        <p>{formatTime(parseIsoDate(entry.occurredAt), localeTag)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {ui.changelogEmpty}
              </p>
            )}
          </section>
        ) : null}
      </main>

      <Dialog onOpenChange={setCreateShiftOpen} open={createShiftOpen}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {ui.createShiftDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {ui.createShiftDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {ui.employee}
              </label>
              <Select
                onValueChange={(value) =>
                  setCreateShiftDraft((current) => ({
                    ...current,
                    employeeId: value,
                  }))
                }
                value={createShiftDraft.employeeId}
              >
                <SelectTrigger>
                  <SelectTriggerLabel>
                    {createShiftDraft.employeeId
                      ? buildEmployeeName(
                          employees.find(
                            (employee) => employee.id === createShiftDraft.employeeId,
                          ) || {},
                        )
                      : ui.selectEmployee}
                  </SelectTriggerLabel>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => {
                    const label = buildEmployeeName(employee);
                    return (
                      <SelectItem key={employee.id} value={employee.id}>
                        <SelectOptionContent>
                          <SelectOptionAvatar
                            alt={label}
                            fallback={getInitials(label)}
                            src={
                              employee.avatarUrl ||
                              getMockAvatarDataUrl(label || employee.id)
                            }
                          />
                          <SelectOptionText>
                            <SelectOptionTitle>{label}</SelectOptionTitle>
                            <SelectOptionDescription data-select-description>
                              {employee.position?.name || ui.employee} ·{" "}
                              {employee.employeeNumber}
                            </SelectOptionDescription>
                          </SelectOptionText>
                        </SelectOptionContent>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {ui.shiftTemplate}
              </label>
              <Select
                onValueChange={(value) =>
                  setCreateShiftDraft((current) => ({
                    ...current,
                    templateId: value,
                  }))
                }
                value={createShiftDraft.templateId}
              >
                <SelectTrigger>
                  <SelectTriggerLabel>
                    {createShiftDraft.templateId
                      ? templates.find(
                          (template) => template.id === createShiftDraft.templateId,
                        )?.name
                      : ui.selectTemplate}
                  </SelectTriggerLabel>
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <SelectOptionContent>
                        <SelectOptionText>
                          <SelectOptionTitle>{template.name}</SelectOptionTitle>
                          <SelectOptionDescription data-select-description>
                            {template.startsAtLocal}-{template.endsAtLocal} ·{" "}
                            {template.location.name}
                          </SelectOptionDescription>
                        </SelectOptionText>
                      </SelectOptionContent>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {ui.date}
              </label>
              <Input
                min={formatDateInput(today)}
                onChange={(event) =>
                  setCreateShiftDraft((current) => ({
                    ...current,
                    shiftDate: event.target.value,
                  }))
                }
                type="date"
                value={createShiftDraft.shiftDate}
              />
            </div>

            <div className="schedule-shift-dialog-actions">
              <Button
                onClick={() => {
                  setCreateShiftOpen(false);
                  setTemplatesOpen(true);
                }}
                type="button"
                variant="outline"
              >
                {ui.templates}
              </Button>
              <Button onClick={() => void handleCreateShift()} type="button">
                {ui.saveShift}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setTemplatesOpen} open={templatesOpen}>
        <DialogContent className="max-w-3xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {ui.templatesDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {ui.templatesDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              {templates.map((template) => (
                <article
                  className="rounded-2xl border border-border bg-secondary/30 p-4"
                  key={template.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        {template.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.startsAtLocal}-{template.endsAtLocal}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTemplateWeekDaysSummary(template.weekDaysJson, ui.dayHeaders, localeTag)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
              <h2 className="font-heading text-lg font-bold text-foreground">
                {ui.newTemplate}
              </h2>
              <div>
                <Input
                  className="h-12 rounded-2xl border-[color:var(--accent)]/15 bg-[color:var(--soft-accent)]/35 px-4 font-heading text-lg placeholder:font-heading placeholder:text-muted-foreground/65 focus-visible:ring-[color:var(--accent)]/20"
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={ui.templateName}
                  value={templateDraft.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      startsAtLocal: event.target.value,
                    }))
                  }
                  type="time"
                  value={templateDraft.startsAtLocal}
                />
                <Input
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      endsAtLocal: event.target.value,
                    }))
                  }
                  type="time"
                  value={templateDraft.endsAtLocal}
                />
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{ui.templateDays}</p>
                  <p className="text-xs text-muted-foreground">{ui.templateDaysHint}</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ui.dayHeaders.map((label, index) => {
                    const day = index + 1;
                    const active = templateDraft.weekDays.includes(day);

                    return (
                      <button
                        className={`flex items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors ${
                          active
                            ? "border-[color:var(--accent)] bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        }`}
                        key={label}
                        onClick={() => toggleTemplateWeekDay(day)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={() => void handleCreateTemplate()} type="button">
                {ui.createTemplateAction}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setMassAssignOpen} open={massAssignOpen}>
        <DialogContent className="max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {ui.massAssignDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {ui.massAssignDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              onValueChange={(value) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  templateId: value,
                }))
              }
              value={massAssignDraft.templateId}
            >
              <SelectTrigger>
                <SelectTriggerLabel
                  className={
                    templates.find(
                      (template) => template.id === massAssignDraft.templateId,
                    )?.name
                      ? undefined
                      : "text-muted-foreground"
                  }
                >
                  {templates.find(
                    (template) => template.id === massAssignDraft.templateId,
                  )?.name ??
                    (templates.length > 0
                      ? ui.selectTemplate
                      : ui.noShiftTemplates)}
                </SelectTriggerLabel>
              </SelectTrigger>
              <SelectContent>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value={EMPTY_SELECT_VALUE}>
                    {ui.noShiftTemplates}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  departmentId: value,
                }))
              }
              value={massAssignDraft.departmentId}
            >
              <SelectTrigger>
                <SelectTriggerLabel>
                  {massAssignDraft.departmentId === "all"
                    ? ui.allDepartments
                    : departments.find(
                        (department) => department.id === massAssignDraft.departmentId,
                      )?.name}
                </SelectTriggerLabel>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allDepartments}</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  locationId: value,
                }))
              }
              value={massAssignDraft.locationId}
            >
              <SelectTrigger>
                <SelectTriggerLabel>
                  {massAssignDraft.locationId === "all"
                    ? ui.allLocations
                    : locations.find(
                        (location) => location.id === massAssignDraft.locationId,
                      )?.name}
                </SelectTriggerLabel>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allLocations}</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  roleId: value,
                }))
              }
              value={massAssignDraft.roleId}
            >
              <SelectTrigger>
                <SelectTriggerLabel>
                  {massAssignDraft.roleId === "all"
                    ? ui.allRoles
                    : positions.find((position) => position.id === massAssignDraft.roleId)
                        ?.name}
                </SelectTriggerLabel>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allRoles}</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              onChange={(event) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
              type="date"
              value={massAssignDraft.dateFrom}
            />
            <Input
              onChange={(event) =>
                setMassAssignDraft((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
              type="date"
              value={massAssignDraft.dateTo}
            />
          </div>

          <Button onClick={() => void handleMassAssign()} type="button">
            {ui.assignShifts}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDay(null);
          }
        }}
        open={Boolean(selectedDay)}
      >
        <DialogContent className="flex h-[85vh] max-h-[85vh] max-w-3xl flex-col overflow-hidden rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-[clamp(0.95rem,1.35vw,1.3rem)] leading-[0.92] tracking-[-0.08em] uppercase text-foreground">
              {selectedDay
                ? formatDateTime(selectedDay, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    weekday: "long",
                  }, localeTag)
                : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEntries.length} {ui.dayDialogEvents} ·{" "}
              {new Set(
                selectedDayEntries.flatMap((entry) => entry.employeeIds).filter(Boolean),
              ).size}{" "}
              {ui.dayDialogEmployees}
            </DialogDescription>
          </DialogHeader>

          <div className="scrollbar-hide flex-1 overflow-y-auto">
            <div>
              {selectedDayEntries.length ? (
                selectedDayEntries.map((entry) => {
                  const isCollapsed = collapsedDayEntryIds.has(entry.id);

                  return (
                    <article
                      className="border-b border-border/70 pb-4 pt-0 last:border-b-0"
                      key={entry.id}
                    >
                      <button
                        className="flex w-full flex-wrap items-start justify-between gap-3 rounded-none bg-[linear-gradient(135deg,rgba(40,75,255,0.08),rgba(40,75,255,0.02)_38%,rgba(255,255,255,0)_100%)] px-3 py-3 text-left transition-all duration-200 hover:bg-[linear-gradient(135deg,rgba(40,75,255,0.13),rgba(40,75,255,0.05)_38%,rgba(255,255,255,0.02)_100%)]"
                        onClick={() => toggleDayEntry(entry.id)}
                        type="button"
                      >
                        <div className="min-w-0 flex flex-1 items-center gap-3">
                          <span
                            className={`shrink-0 pb-[0.08em] font-heading text-[clamp(0.95rem,1.35vw,1.3rem)] font-medium leading-[0.92] tracking-[-0.08em] uppercase ${
                              entry.kind === "shift"
                                ? getEntryToneTextClass(entry.statusTone) ??
                                  "text-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {entry.time}
                          </span>
                          <span className="shrink-0 pb-[0.08em] font-heading text-[clamp(0.95rem,1.35vw,1.3rem)] leading-[0.92] tracking-[-0.08em] uppercase text-muted-foreground">
                            {entry.kind === "shift"
                              ? ui.shift
                              : entry.kind === "meeting"
                                ? ui.meeting
                                : ui.task}
                          </span>
                          <h2 className="min-w-0 flex-1 truncate pb-[0.12em] pr-[0.14em] -mb-[0.12em] -mr-[0.14em] font-heading text-[clamp(0.95rem,1.35vw,1.3rem)] leading-[0.98] tracking-[-0.08em] uppercase text-foreground">
                            {entry.kind === "shift" ? entry.subtitle : entry.title}
                          </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.peopleCount > 1 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                              <Users className="size-3" />
                              {entry.peopleCount}
                            </span>
                          ) : null}
                          {entry.detailItems.length ? (
                            isCollapsed ? (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            )
                          ) : null}
                        </div>
                      </button>

                      {entry.detailItems.length && !isCollapsed ? (
                        <div className="mt-3 space-y-1">
                          {entry.detailItems.map((item) => (
                            <div
                              className="flex items-start gap-3 py-1"
                              key={item.id}
                            >
                              <img
                                alt={item.title}
                                className="size-9 rounded-full object-cover"
                                src={item.avatarSrc}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-heading text-[15px] font-medium text-foreground">
                                  {item.title}
                                </p>
                                {item.subtitle || item.statusPlacement === "inline" ? (
                                  <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    {item.subtitle ? (
                                      <p className="text-[13px] text-muted-foreground">
                                        {item.subtitle}
                                      </p>
                                    ) : (
                                      <span />
                                    )}
                                    {item.statusPlacement === "inline" && item.statusLabel ? (
                                      <span
                                        className={`shrink-0 font-heading text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                          getEntryToneTextClass(item.statusTone) ??
                                          "text-muted-foreground"
                                        }`}
                                      >
                                        {item.statusLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                {(item.statusPlacement !== "inline" && item.statusLabel) ||
                                item.metaLabel ||
                                item.photoProofs?.length ? (
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {item.statusPlacement !== "inline" &&
                                    item.statusLabel ? (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(item.statusTone)}`}
                                      >
                                        {item.statusLabel}
                                      </span>
                                    ) : null}
                                    {item.metaLabel ? (
                                      <span className="text-[12px] text-muted-foreground">
                                        {item.metaLabel}
                                      </span>
                                    ) : null}
                                    {item.photoProofs?.length ? (
                                      <Button
                                        onClick={() =>
                                          setPhotoProofDialogTask({
                                            title: entry.title,
                                            proofs: item.photoProofs ?? [],
                                          })
                                        }
                                        size="xs"
                                        type="button"
                                        variant="outline"
                                      >
                                        <Camera className="size-3" />
                                        {ui.viewPhotos(item.photoProofs.length)}
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {ui.noDayEvents}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border/70 pt-3">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setCreateShiftDraft((current) => ({
                    ...current,
                    shiftDate: formatDateInput(selectedDay ?? today),
                    employeeId:
                      current.employeeId ||
                      (selectedEmployeeId !== "all" ? selectedEmployeeId : ""),
                  }));
                  setCreateShiftOpen(true);
                }}
                type="button"
              >
                <Plus className="size-4" />
                {ui.addShiftForDay}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              {photoProofDialogTask?.title ?? ui.photoProofs}
            </DialogTitle>
            <DialogDescription>
              {ui.photoProofsDescription}
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
                  alt={ui.photoProofs}
                  className="team-tasks-photo-dialog-image"
                  src={proof.url}
                />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {message && !loading ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <div className="max-w-[80vw] rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm text-[color:var(--background)] shadow-[0_14px_32px_rgba(15,23,42,0.22)]">
            {message}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
