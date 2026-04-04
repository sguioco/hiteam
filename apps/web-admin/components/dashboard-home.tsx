"use client";

import {
  FormEvent,
  type ReactNode,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalInboxItem,
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  AttendanceLiveSession,
  CollaborationTaskBoardResponse,
  TaskItem,
  WorkGroupItem,
} from "@smart/types";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Clock3,
  Minus,
  FileSignature,
  ListTodo,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import type { RadioItem } from "@/components/ui/Radio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectOptionContent,
  SelectOptionDescription,
  SelectOptionIcon,
  SelectOptionText,
  SelectOptionTitle,
  SelectTrigger,
  SelectTriggerLabel,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import {
  getSession,
  type AuthSession,
  hasDesktopAdminAccess,
  isEmployeeOnlyRole,
  isManagerOnlyRole,
} from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { createAttendanceLiveSocket } from "@/lib/attendance-socket";
import { getDemoDashboardBootstrap } from "@/lib/demo-api";
import { isDemoAccessToken } from "@/lib/demo-mode";
import {
  buildEmployeeWorkdayLookup,
  formatWorkdayDateLabel,
  getEmployeeWorkdayStatus,
  type EmployeeScheduleShift,
} from "@/lib/employee-workdays";
import { useI18n } from "@/lib/i18n";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { appendTaskMeta, parseTaskMeta } from "@/lib/task-meta";
import {
  ActionCenter,
  getMockActionCenterItems,
  type ActionCenterItem,
} from "@/components/ActionsCenter";
import { ManagerPerformancePanel } from "@/components/dashboard/ManagerPerformancePanel";
import { TasksSidebar as DashboardTasksSidebar } from "@/components/dashboard/TasksSidebar";
import { BirthdaysSidebar as DashboardBirthdaysSidebar } from "@/components/dashboard/BirthdaysSidebar";
import { localizePersonName } from "@/lib/transliteration";
import { useTranslatedTaskCopy } from "@/lib/use-translated-task-copy";

type EmployeeDirectoryItem = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  avatarUrl?: string | null;
  user?: { id: string } | null;
  company?: { name: string } | null;
  department?: { name: string } | null;
};

type TaskDraft = {
  mode: "task" | "meeting";
  title: string;
  description: string;
  targetMode: "employees" | "group";
  assigneeEmployeeIds: string[];
  groupId: string;
  priority: TaskItem["priority"];
  dueAt: string;
  requiresPhoto: boolean;
  isRecurring: boolean;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  weekDays: number[];
  startDate: string;
  endDate: string;
  meetingMode: "online" | "offline";
  meetingLink: string;
  meetingLocation: string;
};

type PersonalCalendarEvent = {
  date: Date;
  description: string;
  displayTitle: string;
  duplicateCount: number;
  id: string;
  isCompleted: boolean;
  kind: "meeting" | "task";
  meetingLink: string | null;
  meetingLocation: string | null;
  participantLabel: string;
  participants: string[];
  time: string | null;
  tooltipLabel: string;
};

type DashboardMessageAction = {
  href: string;
  label: string;
};

type DashboardCachePayload = {
  liveSessions: AttendanceLiveSession[];
  anomalies: AttendanceAnomalyResponse | null;
  requests: ApprovalInboxItem[];
  taskBoard: CollaborationTaskBoardResponse | null;
  employees: EmployeeDirectoryItem[];
  groups: WorkGroupItem[];
  scheduleShifts: EmployeeScheduleShift[];
  canCheckWorkdays: boolean;
  personalHistory: AttendanceHistoryResponse | null;
};

export type DashboardInitialData = DashboardCachePayload;

type AttendanceFilterKey =
  | "all"
  | "present"
  | "absent"
  | "late"
  | "checked"
  | "issues";

const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function toIntlLocale(locale: "ru" | "en") {
  return locale === "ru" ? "ru-RU" : "en-US";
}

function formatActionCenterDate(value: string, locale: "ru" | "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
  });
}

function getRequestActionMeta(
  requestType: ApprovalInboxItem["request"]["requestType"],
  locale: "ru" | "en",
) {
  switch (requestType) {
    case "ADVANCE":
      return {
        category: "decisions" as const,
        type: localize(locale, "Запрос", "Request"),
        icon: TriangleAlert,
        priority: "urgent" as const,
      };
    case "SHIFT_CHANGE":
      return {
        category: "approvals" as const,
        type: localize(locale, "Согласование", "Approval"),
        icon: Users,
        priority: "urgent" as const,
      };
    case "SUPPLY":
      return {
        category: "documents" as const,
        type: localize(locale, "Документ", "Document"),
        icon: FileSignature,
        priority: "normal" as const,
      };
    case "LEAVE":
    case "VACATION_CHANGE":
    case "SICK_LEAVE":
    case "UNPAID_LEAVE":
      return {
        category: "approvals" as const,
        type: localize(locale, "Отсутствие", "Leave"),
        icon: CalendarDays,
        priority: "normal" as const,
      };
    default:
      return {
        category: "documents" as const,
        type: localize(locale, "Документ", "Document"),
        icon: FileSignature,
        priority: "normal" as const,
      };
  }
}

function buildActionCenterItems(
  requests: ApprovalInboxItem[],
  employees: EmployeeDirectoryItem[],
  locale: "ru" | "en",
): ActionCenterItem[] {
  const employeeAvatarMap = new Map(
    employees.map((employee) => [
      employee.id,
      employee.avatarUrl ||
        getMockAvatarDataUrl(
          `${employee.firstName} ${employee.lastName}`.trim(),
        ),
    ]),
  );

  return requests
    .filter((item) => item.status === "PENDING")
    .slice(0, 15)
    .map((item, index) => {
      const employeeName = `${item.request.employee.firstName} ${item.request.employee.lastName}`.trim();
      const localizedName =
        locale === "en" ? localizePersonName(employeeName, locale) : employeeName;
      const periodLabel =
        item.request.startsOn && item.request.endsOn
          ? formatActionCenterDate(item.request.startsOn, locale) ===
            formatActionCenterDate(item.request.endsOn, locale)
            ? formatActionCenterDate(item.request.startsOn, locale)
            : `${formatActionCenterDate(item.request.startsOn, locale)} - ${formatActionCenterDate(item.request.endsOn, locale)}`
          : "";
      const requestedDaysLabel =
        item.request.requestedDays > 0
          ? locale === "ru"
            ? `${item.request.requestedDays} дн.`
            : `${item.request.requestedDays} d`
          : "";
      const currentStep = item.request.approvalSteps.find(
        (step) => step.sequence === item.sequence,
      );
      const meta = getRequestActionMeta(item.request.requestType, locale);
      const descriptionParts = [
        periodLabel,
        requestedDaysLabel,
        currentStep
          ? locale === "ru"
            ? `Шаг ${currentStep.sequence}`
            : `Step ${currentStep.sequence}`
          : "",
      ].filter(Boolean);

      return {
        id: index + 1,
        category: meta.category,
        type: meta.type,
        title: item.request.title,
        from: localizedName,
        avatar: localizedName.slice(0, 2).toUpperCase(),
        avatarUrl:
          employeeAvatarMap.get(item.request.employee.id) ||
          getMockAvatarDataUrl(localizedName),
        description:
          descriptionParts.join(" · ") ||
          localize(locale, "Требуется действие", "Action required"),
        detail:
          item.request.reason ||
          localize(
            locale,
            "Сотрудник не добавил описание.",
            "The employee did not provide a description.",
          ),
        time: formatActionCenterDate(item.request.startsOn, locale),
        isRelativeTime: false,
        priority: meta.priority,
        icon: meta.icon,
      };
    });
}

function buildDashboardCacheKey(
  session: NonNullable<ReturnType<typeof getSession>>,
  isEmployeeMode: boolean,
) {
  return `dashboard:${isEmployeeMode ? "employee" : "admin"}:${session.user.tenantId}:${session.user.id}`;
}

const initialTaskDraft: TaskDraft = {
  mode: "task",
  title: "",
  description: "",
  targetMode: "employees",
  assigneeEmployeeIds: [],
  groupId: "",
  priority: "MEDIUM",
  dueAt: "",
  requiresPhoto: false,
  isRecurring: false,
  frequency: "DAILY",
  weekDays: [1, 2, 3, 4, 5],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  meetingMode: "online",
  meetingLink: "",
  meetingLocation: "",
};

function getPriorityOptions(locale: "ru" | "en"): Array<{
  value: TaskItem["priority"];
  label: string;
  description: string;
  icon: ReactNode;
}> {
  return [
    {
      value: "URGENT",
      label: "Urgent",
      description: localize(locale, "Немедленное выполнение", "Immediate action required"),
      icon: <AlertCircle className="size-4 text-[#b42318]" />,
    },
    {
      value: "HIGH",
      label: "High",
      description: localize(locale, "Высокий приоритет", "High priority"),
      icon: <ArrowUp className="size-4 text-[#d97706]" />,
    },
    {
      value: "MEDIUM",
      label: "Medium",
      description: localize(locale, "Стандартная задача", "Standard priority"),
      icon: <Minus className="size-4 text-[#2563eb]" />,
    },
    {
      value: "LOW",
      label: "Low",
      description: localize(locale, "Можно выполнить позже", "Can be done later"),
      icon: <ArrowDown className="size-4 text-[#0f9b65]" />,
    },
  ];
}

function getWeekdayShortLabel(day: number, locale: "ru" | "en") {
  if (locale === "en") {
    return day === 0
      ? "Su"
      : day === 1
        ? "Mo"
        : day === 2
          ? "Tu"
          : day === 3
            ? "We"
            : day === 4
              ? "Th"
              : day === 5
                ? "Fr"
                : "Sa";
  }

  return day === 0
    ? "Вс"
    : day === 1
      ? "Пн"
      : day === 2
        ? "Вт"
        : day === 3
          ? "Ср"
          : day === 4
            ? "Чт"
            : day === 5
              ? "Пт"
              : "Сб";
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type TaskCheckboxProps = {
  checked: boolean;
  meta: string;
  onChange: () => void;
  title: string;
};

function TaskCheckbox({ checked, meta, onChange, title }: TaskCheckboxProps) {
  const checkboxId = useId();

  return (
    <>
      <input
        checked={checked}
        className="task-checkbox"
        id={checkboxId}
        onChange={onChange}
        type="checkbox"
      />
      <label className="checkbox-label" htmlFor={checkboxId}>
        <span aria-hidden="true" className="checkbox-box">
          <span className="checkbox-fill" />
          <span className="checkmark">
            <Check className="check-icon" />
          </span>
          <span className="success-ripple" />
        </span>
        <span className="checkbox-copy">
          <span className="checkbox-text">{title}</span>
          <span className="checkbox-meta">{meta}</span>
        </span>
      </label>
    </>
  );
}

function formatDateTime(value: string, locale: "ru" | "en") {
  return new Date(value).toLocaleString(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string | null | undefined, locale: "ru" | "en") {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeLocalInput(value: Date) {
  const next = new Date(value.getTime());
  next.setSeconds(0, 0);
  return new Date(next.getTime() - next.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfSixMonthWindow(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() - 5, 1);
}

function formatDayHeader(value: Date, locale: "ru" | "en") {
  return value.toLocaleDateString(toIntlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatMonthLabel(value: Date, locale: "ru" | "en") {
  return value
    .toLocaleDateString(toIntlLocale(locale), { month: "long" })
    .replace(/\.$/, "")
    .toUpperCase();
}

function formatWeekdayLabel(value: Date, locale: "ru" | "en") {
  return value
    .toLocaleDateString(toIntlLocale(locale), { weekday: "short" })
    .replace(/\.$/, "")
    .toUpperCase();
}

function getAttendanceArrivalLabel(
  session: AttendanceLiveSession | undefined,
  locale: "ru" | "en",
) {
  if (!session) return localize(locale, "Отсутствует", "Absent");
  if (session.lateMinutes > 0) {
    return locale === "ru"
      ? `Опоздание +${session.lateMinutes} мин`
      : `Late +${session.lateMinutes} min`;
  }
  if (session.status === "on_break") return localize(locale, "На перерыве", "On break");
  if (session.status === "checked_out") {
    return localize(locale, "Завершил смену", "Shift completed");
  }
  return localize(locale, "Вовремя", "On time");
}

function getAttendanceArrivalTone(session: AttendanceLiveSession | undefined) {
  if (!session) return "absent";
  if (session.lateMinutes > 0) return "late";
  if (session.status === "on_break") return "break";
  if (session.status === "checked_out") return "checked";
  return "ontime";
}

function nextBirthdayDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function shouldShowCompletedTask(task: TaskItem, referenceDay: Date) {
  if (task.status !== "DONE") return false;
  const completedAt = task.completedAt ?? task.updatedAt;
  if (!completedAt) return false;
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  return isSameDay(startOfDay(completedDate), referenceDay);
}

function formatTaskCountLabel(count: number, locale: "ru" | "en") {
  if (locale === "en") {
    return count === 1 ? "1 task" : `${count} tasks`;
  }
  if (count === 1) return "1 задача";
  if (count >= 2 && count <= 4) return `${count} задачи`;
  return `${count} задач`;
}

function formatParticipantSummary(
  names: string[],
  kind: "meeting" | "task",
  locale: "ru" | "en",
) {
  if (names.length === 0) {
    return kind === "meeting"
      ? localize(locale, "Без участников", "No participants")
      : localize(locale, "Без исполнителей", "No assignees");
  }
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return locale === "ru"
    ? `${names[0]}, ${names[1]} и ещё ${names.length - 2}`
    : `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

function formatParticipantLabel(
  count: number,
  kind: "meeting" | "task",
  locale: "ru" | "en",
) {
  if (locale === "en") {
    if (kind === "meeting") {
      return count === 1 ? "1 participant" : `${count} participants`;
    }
    return count === 1 ? "1 assignee" : `${count} assignees`;
  }
  if (kind === "meeting") {
    if (count === 1) return "1 участник";
    if (count >= 2 && count <= 4) return `${count} участника`;
    return `${count} участников`;
  }

  if (count === 1) return "1 исполнитель";
  if (count >= 2 && count <= 4) return `${count} исполнителя`;
  return `${count} исполнителей`;
}

function sortWeeklyCalendarTasks(left: TaskItem, right: TaskItem) {
  const leftDone = left.status === "DONE";
  const rightDone = right.status === "DONE";

  if (leftDone !== rightDone) {
    return leftDone ? 1 : -1;
  }

  if (!left.dueAt && !right.dueAt) return 0;
  if (!left.dueAt) return 1;
  if (!right.dueAt) return -1;
  return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
}

function createMockTaskDate(offsetDays: number, hours: number, minutes: number) {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function createMockDashboardTasks(
  managerEmployee: EmployeeDirectoryItem | null,
  locale: "ru" | "en",
): TaskItem[] {
  const managerRef = {
    id: "mock-manager",
    firstName: localize(locale, "Анна", "Anna"),
    lastName: localize(locale, "Крылова", "Krylova"),
  };
  const assigneeRef = managerEmployee
    ? {
        id: managerEmployee.id,
        firstName: managerEmployee.firstName,
        lastName: managerEmployee.lastName,
        employeeNumber: "0001",
        department: managerEmployee.department
          ? { id: `dept-${managerEmployee.id}`, name: managerEmployee.department.name }
          : null,
        primaryLocation: null,
      }
    : {
        id: "mock-employee",
        firstName: localize(locale, "Алексей", "Alexey"),
        lastName: localize(locale, "Соколов", "Sokolov"),
        employeeNumber: "0001",
        department: { id: "dept-ops", name: localize(locale, "Операции", "Operations") },
        primaryLocation: null,
      };

  const buildTask = (
    id: string,
    title: string,
    description: string | null,
    dueAt: string | null,
    priority: TaskItem["priority"],
    status: TaskItem["status"] = "TODO",
  ): TaskItem => ({
    id,
    title,
    description,
    status,
    priority,
    requiresPhoto: false,
    isRecurring: false,
    taskTemplateId: null,
    occurrenceDate: null,
    dueAt,
    completedAt: null,
    createdAt: createMockTaskDate(-2, 9, 0),
    updatedAt: createMockTaskDate(-1, 12, 0),
    groupId: null,
    assigneeEmployeeId: assigneeRef.id,
    managerEmployee: managerRef,
    assigneeEmployee: assigneeRef,
    group: null,
    checklistItems: [],
    activities: [],
    photoProofs: [],
  });

  return [
    buildTask(
      "mock-task-1",
      localize(locale, "Проверить табель за первую половину месяца", "Review the timesheet for the first half of the month"),
      localize(locale, "Сверить отметки прихода и подготовить комментарии по отклонениям.", "Compare attendance punches and prepare comments on deviations."),
      createMockTaskDate(0, 10, 30),
      "HIGH",
    ),
    buildTask(
      "mock-task-2",
      `${localize(locale, "Встреча", "Meeting")}: ${localize(locale, "Ежедневный синк по сменам", "Daily shift sync")}`,
      appendTaskMeta(localize(locale, "Обсуждение покрытия вечерних смен и замен на выходные.", "Discuss evening shift coverage and weekend substitutions."), {
        kind: "meeting",
        meetingMode: "offline",
        meetingLocation: localize(locale, "Переговорная B", "Meeting room B"),
      }) ?? null,
      createMockTaskDate(0, 15, 0),
      "MEDIUM",
      "IN_PROGRESS",
    ),
    buildTask(
      "mock-task-3",
      localize(locale, "Подготовить список сотрудников на обучение", "Prepare the training shortlist"),
      localize(locale, "Собрать кандидатов на апрельское внутреннее обучение и согласовать отделы.", "Gather candidates for April internal training and align with departments."),
      createMockTaskDate(1, 11, 15),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4",
      `${localize(locale, "Встреча", "Meeting")}: ${localize(locale, "Разбор опозданий за неделю", "Weekly late-arrival review")}`,
      appendTaskMeta(localize(locale, "Короткий созвон с HR по повторяющимся опозданиям.", "Short call with HR about repeated late arrivals."), {
        kind: "meeting",
        meetingMode: "online",
        meetingLink: "https://meet.example.com/attendance-review",
      }) ?? null,
      createMockTaskDate(2, 16, 0),
      "URGENT",
    ),
    buildTask(
      "mock-task-4a",
      localize(locale, "Проверить подтверждение смен на вечер", "Review evening shift confirmations"),
      localize(locale, "Проверить, кто подтвердил вечерние смены на пятницу, и закрыть незаполненные слоты.", "Check who confirmed Friday evening shifts and close unfilled slots."),
      createMockTaskDate(2, 10, 0),
      "HIGH",
    ),
    buildTask(
      "mock-task-4b",
      localize(locale, "Собрать причины опозданий по группе А", "Collect late-arrival reasons for group A"),
      localize(locale, "Сверить объяснительные и обновить комментарии в табеле перед встречей с HR.", "Review explanations and update timesheet comments before the HR meeting."),
      createMockTaskDate(2, 11, 30),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4c",
      localize(locale, "Проверить готовность формы отчета", "Check report form readiness"),
      localize(locale, "Убедиться, что шаблон отчета по посещаемости заполнен и готов к отправке руководителю.", "Make sure the attendance report template is complete and ready to be sent to the manager."),
      createMockTaskDate(2, 13, 15),
      "LOW",
    ),
    buildTask(
      "mock-task-4d",
      localize(locale, "Согласовать подмену на субботу", "Approve Saturday substitution"),
      localize(locale, "Связаться с сотрудниками по субботней смене и зафиксировать финальную подмену в расписании.", "Contact Saturday shift employees and lock the final substitution in the schedule."),
      createMockTaskDate(2, 14, 40),
      "HIGH",
    ),
    buildTask(
      "mock-task-4e",
      localize(locale, "Подготовить комментарии по смене 19 марта", "Prepare comments for the March 19 shift"),
      localize(locale, "Собрать замечания по фактическим отметкам и вынести короткое резюме для менеджера смены.", "Collect notes on actual punches and prepare a short summary for the shift manager."),
      createMockTaskDate(2, 15, 20),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4f",
      localize(locale, "Проверить закрытие ночного слота", "Check night-slot coverage"),
      localize(locale, "Убедиться, что ночной слот на пятницу подтвержден и сотрудник получил уведомление.", "Make sure the Friday night slot is confirmed and the employee received the notification."),
      createMockTaskDate(2, 17, 10),
      "HIGH",
    ),
    buildTask(
      "mock-task-4g",
      localize(locale, "Обновить список контактов дежурной группы", "Update the on-duty contact list"),
      localize(locale, "Сверить телефоны и мессенджеры по дежурной группе перед выходными.", "Verify phone numbers and messengers for the on-duty group before the weekend."),
      createMockTaskDate(2, 18, 5),
      "LOW",
    ),
    buildTask(
      "mock-task-4h",
      localize(locale, "Подтвердить готовность подменного состава", "Confirm backup coverage readiness"),
      localize(locale, "Проверить, что резерв на конец недели назначен и видит своё расписание.", "Check that the end-of-week backup is assigned and can see the schedule."),
      createMockTaskDate(3, 9, 20),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-5",
      localize(locale, "Проверить готовность графика на выходные", "Check weekend schedule readiness"),
      localize(locale, "Убедиться, что все слоты закрыты и нет пересечений по сменам.", "Make sure all slots are covered and there are no shift overlaps."),
      createMockTaskDate(4, 9, 45),
      "HIGH",
    ),
    buildTask(
      "mock-task-5a",
      localize(locale, "Сверить список выходящих в субботу", "Review Saturday roster"),
      localize(locale, "Проверить подтверждения по сотрудникам субботней смены и убрать дубли.", "Check confirmations for Saturday shift employees and remove duplicates."),
      createMockTaskDate(4, 11, 0),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-5b",
      localize(locale, "Подготовить короткий отчет по загрузке недели", "Prepare a short weekly workload report"),
      localize(locale, "Собрать по дням количество задач и передать сводку в конце пятницы.", "Collect the number of tasks by day and send the summary at the end of Friday."),
      createMockTaskDate(4, 12, 25),
      "LOW",
    ),
    buildTask(
      "mock-task-6",
      `${localize(locale, "Встреча", "Meeting")}: ${localize(locale, "1-on-1 по итогам недели", "Weekly 1-on-1 recap")}`,
      appendTaskMeta(localize(locale, "Поговорить о загрузке, качестве смен и точках роста.", "Discuss workload, shift quality and growth points."), {
        kind: "meeting",
        meetingMode: "offline",
        meetingLocation: localize(locale, "Кабинет менеджера", "Manager office"),
      }) ?? null,
      createMockTaskDate(5, 13, 30),
      "LOW",
    ),
    buildTask(
      "mock-task-7",
      localize(locale, "Собрать просроченные подтверждения смен", "Collect overdue shift confirmations"),
      localize(locale, "Есть неподтверждённые слоты за вчера, нужно быстро закрыть вопрос.", "There are unconfirmed slots from yesterday and they need to be resolved quickly."),
      createMockTaskDate(-1, 18, 0),
      "URGENT",
    ),
  ];
}

export default function DashboardHome({
  initialData,
  initialSession = null,
  mode = "admin",
}: {
  initialData?: DashboardInitialData | null;
  initialSession?: AuthSession | null;
  mode?: "admin" | "employee";
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const priorityOptions = useMemo(() => getPriorityOptions(locale), [locale]);
  const session = initialSession ?? getSession();
  const isDemoSession = isDemoAccessToken(session?.accessToken);
  const isEmployeeMode =
    mode === "employee" || isEmployeeOnlyRole(session?.user.roleCodes ?? []);
  const dashboardCacheKey = useMemo(
    () => (session ? buildDashboardCacheKey(session, isEmployeeMode) : null),
    [isEmployeeMode, session],
  );
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(
    initialData?.liveSessions ?? [],
  );
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    initialData?.anomalies ?? null,
  );
  const [requests, setRequests] = useState<ApprovalInboxItem[]>(
    initialData?.requests ?? [],
  );
  const [taskBoard, setTaskBoard] =
    useState<CollaborationTaskBoardResponse | null>(initialData?.taskBoard ?? null);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>(
    initialData?.employees ?? [],
  );
  const [groups, setGroups] = useState<WorkGroupItem[]>(initialData?.groups ?? []);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(initialTaskDraft);
  const [mockTaskStatuses, setMockTaskStatuses] = useState<
    Record<string, TaskItem["status"]>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageAction, setMessageAction] =
    useState<DashboardMessageAction | null>(null);
  const [scheduleShifts, setScheduleShifts] = useState<EmployeeScheduleShift[]>(
    initialData?.scheduleShifts ?? [],
  );
  const [canCheckWorkdays, setCanCheckWorkdays] = useState(
    initialData?.canCheckWorkdays ?? false,
  );
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<PersonalCalendarEvent | null>(null);
  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilterKey>("all");
  const [personalHistory, setPersonalHistory] =
    useState<AttendanceHistoryResponse | null>(initialData?.personalHistory ?? null);
  const didUseInitialData = useRef(Boolean(initialData));
  function applyDashboardSnapshot(
    snapshot: DashboardCachePayload,
    cacheKey?: string | null,
  ) {
    setLiveSessions(snapshot.liveSessions);
    setAnomalies(snapshot.anomalies);
    setRequests(snapshot.requests);
    setTaskBoard(snapshot.taskBoard);
    setEmployees(snapshot.employees);
    setGroups(snapshot.groups);
    setScheduleShifts(snapshot.scheduleShifts);
    setCanCheckWorkdays(snapshot.canCheckWorkdays);
    setPersonalHistory(snapshot.personalHistory);

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }
  }

  async function loadData() {
    const currentSession = getSession();
    if (!currentSession) return;
    const snapshot = await apiRequest<{
      initialData: DashboardCachePayload;
      mode: "admin" | "employee";
    }>("/bootstrap/dashboard", {
      token: currentSession.accessToken,
    });

    applyDashboardSnapshot(snapshot.initialData, dashboardCacheKey);
  }

  useEffect(() => {
    if (initialData || !isDemoSession || typeof window === "undefined") {
      return;
    }

    const demoSnapshot = getDemoDashboardBootstrap(
      session?.accessToken,
    ).initialData as DashboardCachePayload;
    applyDashboardSnapshot(demoSnapshot, dashboardCacheKey);
  }, [dashboardCacheKey, initialData, isDemoSession, session?.accessToken]);

  useEffect(() => {
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      if (dashboardCacheKey) {
        writeClientCache(dashboardCacheKey, initialData);
      }
      return;
    }

    if (dashboardCacheKey) {
      const cachedDashboard = readClientCache<DashboardCachePayload>(
        dashboardCacheKey,
        DASHBOARD_CACHE_TTL_MS,
      );

      if (cachedDashboard) {
        applyDashboardSnapshot(cachedDashboard.value);
        if (!cachedDashboard.isStale) {
          return;
        }
      }
    }

    void loadData();
  }, [dashboardCacheKey, initialData, isEmployeeMode]);

  useEffect(() => {
    if (!session) return;

    const attendanceSocket = createAttendanceLiveSocket(session.accessToken);

    attendanceSocket.on(
      "attendance:team-live",
      (payload: AttendanceLiveSession[]) => {
        setLiveSessions(payload);
      },
    );

    return () => {
      attendanceSocket.disconnect();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => {
      setMessage(null);
      setMessageAction(null);
    }, messageAction ? 6000 : 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message, messageAction]);

  const managerEmployee = useMemo(
    () =>
      employees.find((employee) => employee.user?.id === session?.user.id) ??
      null,
    [employees, session?.user.id],
  );
  const managerOnly = isManagerOnlyRole(session?.user.roleCodes ?? []);
  const canUseDesktopAdminTools = hasDesktopAdminAccess(
    session?.user.roleCodes ?? [],
  );
  const dashboardTasks = useMemo(() => {
    const apiTasks = taskBoard?.tasks ?? [];

    if (!isDemoSession) {
      return apiTasks;
    }

    return apiTasks.map((task) => ({
      ...task,
      status: mockTaskStatuses[task.id] ?? task.status,
      completedAt:
        (mockTaskStatuses[task.id] ?? task.status) === "DONE"
          ? new Date().toISOString()
          : task.completedAt,
    }));
  }, [isDemoSession, mockTaskStatuses, taskBoard?.tasks]);
  const personalTasks = useMemo(() => {
    if (isEmployeeMode) {
      return dashboardTasks;
    }

    const tasks = dashboardTasks;
    if (!managerEmployee) return tasks;
    return tasks.filter((task) => task.assigneeEmployeeId === managerEmployee.id);
  }, [dashboardTasks, isEmployeeMode, managerEmployee]);
  const { getTaskBody, getTaskMeetingLocation, getTaskTitle } =
    useTranslatedTaskCopy(dashboardTasks, locale);
  const employeeWorkdayLookup = useMemo(
    () => buildEmployeeWorkdayLookup(scheduleShifts),
    [scheduleShifts],
  );
  const selectedAssigneeDayStatuses = useMemo(() => {
    if (
      !canCheckWorkdays ||
      !taskDraft.dueAt ||
      taskDraft.targetMode !== "employees"
    ) {
      return [];
    }

    return taskDraft.assigneeEmployeeIds
      .map((employeeId) => {
        const employee = employees.find((item) => item.id === employeeId);
        const status = getEmployeeWorkdayStatus(
          employeeWorkdayLookup,
          employeeId,
          taskDraft.dueAt,
        );

        if (!employee || !status) {
          return null;
        }

        return {
          employeeId,
          dayKey: status.dayKey,
          isWorkday: status.isWorkday,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          employeeId: string;
          dayKey: string;
          isWorkday: boolean;
          name: string;
        } => Boolean(item),
      )
      .sort((left, right) => Number(left.isWorkday) - Number(right.isWorkday));
  }, [
    canCheckWorkdays,
    employeeWorkdayLookup,
    employees,
    taskDraft.assigneeEmployeeIds,
    taskDraft.dueAt,
    taskDraft.targetMode,
  ]);
  const hasDayOffAssignee = selectedAssigneeDayStatuses.some(
    (item) => !item.isWorkday,
  );
  const pendingRequests = requests.filter((item) => item.status === "PENDING");
  const signOffItems = pendingRequests.filter(
    (item) => item.request.attachments.length > 0,
  );
  const actionCenterItems = useMemo(
    () => buildActionCenterItems(requests, employees, locale),
    [employees, locale, requests],
  );
  const actionCenterAvatarMap = useMemo(
    () =>
      new Map(
        actionCenterItems
          .filter((item) => item.avatarUrl)
          .map((item) => [item.from.toLowerCase(), item.avatarUrl as string]),
      ),
    [actionCenterItems],
  );
  const issueItems = anomalies?.items ?? [];
  const issuePreview = showAllIssues ? issueItems : issueItems.slice(0, 4);
  const birthdaysItems = useMemo(() => {
    if (isDemoSession) {
      const birthdayOffsets = [1, 3, 6];
      const mockPeople = Array.from(
        new Map(
          getMockActionCenterItems(locale)
            .filter((item) => item.from.trim().length > 0)
            .map((item) => [item.from, item]),
        ).values(),
      ).slice(0, 3);

      return mockPeople.map((item, index) => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + birthdayOffsets[index]);

        return {
          name: item.from,
          dateLabel: nextDate.toLocaleDateString(toIntlLocale(locale), {
            day: "numeric",
            month: "long",
          }),
          avatarUrl: item.avatarUrl || getMockAvatarDataUrl(item.from),
        };
      });
    }

    return employees
      .map((employee) => ({
        employee,
        nextDate: nextBirthdayDate(employee.birthDate),
      }))
      .filter(
        (item): item is { employee: EmployeeDirectoryItem; nextDate: Date } =>
          Boolean(item.nextDate),
      )
      .sort((left, right) => left.nextDate.getTime() - right.nextDate.getTime())
      .slice(0, 5)
      .map((item) => ({
        name: `${item.employee.firstName} ${item.employee.lastName}`.trim(),
        dateLabel: item.nextDate.toLocaleDateString(toIntlLocale(locale), {
          day: "numeric",
          month: "long",
        }),
        avatarUrl:
          item.employee.avatarUrl ||
          actionCenterAvatarMap.get(
            `${item.employee.firstName} ${item.employee.lastName}`.trim().toLowerCase(),
          ) ||
          actionCenterAvatarMap.get(
            (locale === "en"
              ? localizePersonName(
                  `${item.employee.firstName} ${item.employee.lastName}`.trim(),
                  locale,
                )
              : `${item.employee.firstName} ${item.employee.lastName}`.trim()
            ).toLowerCase(),
          ) ||
          getMockAvatarDataUrl(
            `${item.employee.firstName} ${item.employee.lastName}`.trim(),
          ),
      }));
  }, [actionCenterAvatarMap, employees, isDemoSession, locale]);
  const today = startOfDay(new Date());
  const presentCount = liveSessions.length;
  const absentCount = Math.max(0, employees.length - presentCount);

  const stats = {
    onShift: liveSessions.filter((item) => item.status === "on_shift").length,
    onBreak: liveSessions.filter((item) => item.status === "on_break").length,
    checkedOut: liveSessions.filter((item) => item.status === "checked_out")
      .length,
    late: liveSessions.filter((item) => item.lateMinutes > 0).length,
    missingPunch: issueItems.filter(
      (item) =>
        item.type === "MISSED_CHECK_IN" || item.type === "MISSED_CHECK_OUT",
    ).length,
  };
  const attendanceChips: RadioItem[] = [
    { key: "all", label: localize(locale, "Все", "All"), value: employees.length },
    {
      key: "present",
      label: localize(locale, "Пришли", "Present"),
      value: presentCount,
    },
    {
      key: "absent",
      label: localize(locale, "Отсутствуют", "Absent"),
      value: absentCount,
    },
    {
      key: "late",
      label: localize(locale, "Опоздание", "Late"),
      value: stats.late,
    },
    {
      key: "checked",
      label: localize(locale, "Завершили", "Checked out"),
      value: stats.checkedOut,
    },
    {
      key: "issues",
      label: localize(locale, "Без отметки", "Missing punch"),
      value: stats.missingPunch,
    },
  ];
  const issueEmployeeIds = new Set(
    issueItems
      .filter(
        (item) =>
          item.type === "MISSED_CHECK_IN" || item.type === "MISSED_CHECK_OUT",
      )
      .map((item) => item.employeeId),
  );
  const liveSessionByEmployeeId = new Map(
    liveSessions.map((session) => [session.employeeId, session] as const),
  );
  const attendanceRows = employees
    .map((employee) => {
      const session = liveSessionByEmployeeId.get(employee.id);
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      const hasMissingPunch = issueEmployeeIds.has(employee.id);

      return {
        id: employee.id,
        initials: getInitials(fullName),
        name: fullName,
        schedule: session?.shiftLabel ?? localize(locale, "Нет расписания", "No schedule"),
        arrival: getAttendanceArrivalLabel(session, locale),
        arrivalTone: getAttendanceArrivalTone(session),
        departure: session?.endedAt
          ? formatTime(session.endedAt, locale)
          : session
            ? localize(locale, "В смене", "On shift")
            : "—",
        hasMissingPunch,
        isLate: Boolean(session?.lateMinutes && session.lateMinutes > 0),
        isPresent: Boolean(session),
        status: session?.status ?? null,
      };
    })
    .sort(
      (left, right) =>
        Number(right.isPresent) - Number(left.isPresent) ||
        left.name.localeCompare(right.name, toIntlLocale(locale)),
    );
  const filteredAttendanceRows = attendanceRows
    .filter((row) => {
      switch (attendanceFilter) {
        case "present":
          return row.isPresent;
        case "absent":
          return !row.isPresent;
        case "late":
          return row.isLate;
        case "checked":
          return row.status === "checked_out";
        case "issues":
          return row.hasMissingPunch;
        default:
          return true;
      }
    })
    .slice(0, 8);
  const weeklyCalendar = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const eventMap = new Map<string, Omit<PersonalCalendarEvent, "participantLabel" | "tooltipLabel" | "date">>();

    dashboardTasks
      .filter((task) => {
        if (!task.dueAt) return false;
        if (task.status === "DONE" && !shouldShowCompletedTask(task, today)) {
          return false;
        }
        if (managerEmployee && task.assigneeEmployeeId !== managerEmployee.id) {
          return false;
        }
        const dueDate = new Date(task.dueAt);
        return dueDate >= dayStart && dueDate < dayEnd;
      })
      .sort(sortWeeklyCalendarTasks)
      .forEach((task) => {
        const meta = parseTaskMeta(task.description);
        const kind =
          meta.meeting || /^(Встреча|Meeting):/i.test(task.title)
            ? "meeting"
            : "task";
        const isCompleted = task.status === "DONE";
        const displayTitle = getTaskTitle(task, {
          stripMeetingPrefix: kind === "meeting",
        });
        const participantName = task.assigneeEmployee
          ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}`
          : task.group?.name ?? localize(locale, "Без исполнителя", "No assignee");
        const eventKey = `${task.dueAt}|${kind}|${isCompleted ? "done" : "open"}|${displayTitle.toLowerCase()}`;
        const existing = eventMap.get(eventKey);

        if (existing) {
          existing.duplicateCount += 1;
          if (!existing.participants.includes(participantName)) {
            existing.participants.push(participantName);
          }
          const translatedBody = getTaskBody(task);
          if (!existing.description && translatedBody) {
            existing.description = translatedBody;
          }
          const translatedMeetingLocation = getTaskMeetingLocation(task);
          if (!existing.meetingLocation && translatedMeetingLocation) {
            existing.meetingLocation = translatedMeetingLocation;
          }
          if (!existing.meetingLink && meta.meeting?.meetingLink) {
            existing.meetingLink = meta.meeting.meetingLink;
          }
          return;
        }

        eventMap.set(eventKey, {
          id: task.id,
          displayTitle,
          isCompleted,
          time: isCompleted ? null : formatTime(task.dueAt, locale),
          kind,
          participants: [participantName],
          duplicateCount: 1,
          description: getTaskBody(task),
          meetingLocation: getTaskMeetingLocation(task) || null,
          meetingLink: meta.meeting?.meetingLink ?? null,
        });
      });

    const events: PersonalCalendarEvent[] = Array.from(eventMap.values())
      .map((event) => ({
        ...event,
        date,
        participantLabel: formatParticipantSummary(
          event.participants,
          event.kind,
          locale,
        ),
        tooltipLabel: formatParticipantLabel(
          event.participants.length,
          event.kind,
          locale,
        ),
      }))
      .sort((left, right) => {
        if (left.isCompleted !== right.isCompleted) {
          return left.isCompleted ? 1 : -1;
        }
        if (!left.time && !right.time) return 0;
        if (!left.time) return 1;
        if (!right.time) return -1;
        return left.time.localeCompare(right.time, toIntlLocale(locale));
      });

    return {
      date,
      label: formatDayHeader(date, locale),
      monthLabel: formatMonthLabel(date, locale),
      weekdayLabel: formatWeekdayLabel(date, locale),
      weekdayLongLabel: date
        .toLocaleDateString(toIntlLocale(locale), { weekday: "long" })
        .toUpperCase(),
      dateNumber: date.getDate(),
      taskCountLabel: formatTaskCountLabel(events.length, locale),
      tasks: events,
    };
  });

  async function handleTaskStatus(taskId: string, status: TaskItem["status"]) {
    if (taskId.startsWith("mock-task-")) {
      setMockTaskStatuses((current) => ({ ...current, [taskId]: status }));
      setMessageAction(null);
      setMessage(
        status === "DONE"
          ? localize(locale, "Mock-задача отмечена как выполненная.", "Mock task marked as done.")
          : localize(locale, "Статус mock-задачи обновлен.", "Mock task status updated."),
      );
      return;
    }
    if (!session) return;
    await apiRequest(`/collaboration/tasks/${taskId}/status`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ status }),
    });
    setMessageAction(null);
    setMessage(
      status === "DONE"
        ? localize(locale, "Задача отмечена как выполненная.", "Task marked as done.")
        : localize(locale, "Статус задачи обновлен.", "Task status updated."),
    );
    await loadData();
  }

  async function handleApprove(requestId: string) {
    if (!session) return;
    await apiRequest(`/requests/${requestId}/approve`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({}),
    });
    setMessageAction(null);
    setMessage(localize(locale, "Запрос подтвержден.", "Request approved."));
    await loadData();
  }

  async function submitTaskDraft(allowDayOff = false) {
    if (!session) return;

    const assigneeEmployeeIds = Array.from(
      new Set(taskDraft.assigneeEmployeeIds.filter(Boolean)),
    );
    const selectedGroupId = taskDraft.groupId.trim();
    const isEmployeeTargetMode = taskDraft.targetMode === "employees";
    const hasTargets = isEmployeeTargetMode
      ? assigneeEmployeeIds.length > 0
      : Boolean(selectedGroupId);

    if (!hasTargets) {
      setMessageAction(null);
      setMessage(
        isEmployeeTargetMode
          ? localize(locale, "Выберите хотя бы одного сотрудника.", "Select at least one employee.")
          : localize(locale, "Выберите группу.", "Select a group."),
      );
      return;
    }

    if (taskDraft.dueAt) {
      const dueDate = new Date(taskDraft.dueAt);
      if (Number.isNaN(dueDate.getTime()) || dueDate < new Date()) {
        setMessageAction(null);
        setMessage(
          taskDraft.mode === "meeting"
            ? localize(locale, "Нельзя создать встречу в прошлом.", "A meeting cannot be created in the past.")
            : localize(locale, "Нельзя создать задачу с прошедшим сроком.", "A task cannot be created with a past due date."),
        );
        return;
      }
    }

    if (
      !allowDayOff &&
      canCheckWorkdays &&
      isEmployeeTargetMode &&
      hasDayOffAssignee
    ) {
      setTaskDayOffConfirmOpen(true);
      return;
    }

    const payloadDescription =
      taskDraft.mode === "meeting"
        ? appendTaskMeta(taskDraft.description, {
            kind: "meeting",
            meetingMode: taskDraft.meetingMode,
            meetingLink: taskDraft.meetingLink || undefined,
            meetingLocation: taskDraft.meetingLocation || undefined,
          })
        : taskDraft.description.trim() || undefined;

    if (taskDraft.mode === "task" && taskDraft.isRecurring) {
      if (isEmployeeTargetMode) {
        await Promise.all(
          assigneeEmployeeIds.map((assigneeEmployeeId) =>
            apiRequest("/collaboration/task-templates", {
              method: "POST",
              token: session.accessToken,
              body: JSON.stringify({
                title: taskDraft.title,
                description: taskDraft.description.trim() || undefined,
                priority: taskDraft.priority,
                requiresPhoto: taskDraft.requiresPhoto || undefined,
                expandOnDemand: true,
                frequency: taskDraft.frequency,
                weekDays:
                  taskDraft.frequency === "WEEKLY"
                    ? taskDraft.weekDays
                    : undefined,
                startDate:
                  taskDraft.startDate ||
                  new Date().toISOString().split("T")[0],
                endDate: taskDraft.endDate || undefined,
                dueAfterDays: 0,
                assigneeEmployeeId,
              }),
            }),
          ),
        );
      } else {
        await apiRequest("/collaboration/task-templates", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            title: taskDraft.title,
            description: taskDraft.description.trim() || undefined,
            priority: taskDraft.priority,
            requiresPhoto: taskDraft.requiresPhoto || undefined,
            expandOnDemand: true,
            frequency: taskDraft.frequency,
            weekDays:
              taskDraft.frequency === "WEEKLY" ? taskDraft.weekDays : undefined,
            startDate:
              taskDraft.startDate || new Date().toISOString().split("T")[0],
            endDate: taskDraft.endDate || undefined,
            dueAfterDays: 0,
            groupId: selectedGroupId,
          }),
        });
      }
    } else if (isEmployeeTargetMode) {
      await Promise.all(
        assigneeEmployeeIds.map((assigneeEmployeeId) =>
          apiRequest("/collaboration/tasks", {
            method: "POST",
            token: session.accessToken,
            body: JSON.stringify({
              title:
                taskDraft.mode === "meeting"
                  ? `${localize(locale, "Встреча", "Meeting")}: ${taskDraft.title}`
                  : taskDraft.title,
              description: payloadDescription,
              assigneeEmployeeId,
              priority: taskDraft.priority,
              dueAt: taskDraft.dueAt || undefined,
              requiresPhoto:
                taskDraft.mode === "task" && taskDraft.requiresPhoto
                  ? true
                  : undefined,
            }),
          }),
        ),
      );
    } else {
      await apiRequest("/collaboration/tasks", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          title:
            taskDraft.mode === "meeting"
              ? `${localize(locale, "Встреча", "Meeting")}: ${taskDraft.title}`
              : taskDraft.title,
          description: payloadDescription,
          groupId: selectedGroupId,
          priority: taskDraft.priority,
          dueAt: taskDraft.dueAt || undefined,
          requiresPhoto:
            taskDraft.mode === "task" && taskDraft.requiresPhoto
              ? true
              : undefined,
        }),
      });
    }

    setTaskDraft(initialTaskDraft);
    setCreateTaskOpen(false);
    setTaskDayOffConfirmOpen(false);
    setMessageAction({
      href: `/schedule?date=${(taskDraft.dueAt || new Date().toISOString()).slice(0, 10)}&eventType=${
        taskDraft.mode === "meeting" ? "meetings" : "tasks"
      }`,
      label: localize(locale, "Открыть в календаре", "Open in calendar"),
    });
    setMessage(
      taskDraft.mode === "meeting"
        ? isEmployeeTargetMode
          ? localize(
              locale,
              `Встреча создана для ${assigneeEmployeeIds.length} сотрудников.`,
              `Meeting created for ${assigneeEmployeeIds.length} employees.`,
            )
          : localize(locale, "Встреча создана для группы.", "Meeting created for the group.")
        : taskDraft.isRecurring
          ? isEmployeeTargetMode
            ? localize(
                locale,
                `Шаблон задачи создан для ${assigneeEmployeeIds.length} сотрудников.`,
                `Task template created for ${assigneeEmployeeIds.length} employees.`,
              )
            : localize(locale, "Шаблон задачи создан для группы.", "Task template created for the group.")
          : isEmployeeTargetMode
            ? localize(
                locale,
                `Задача создана для ${assigneeEmployeeIds.length} сотрудников.`,
                `Task created for ${assigneeEmployeeIds.length} employees.`,
              )
            : localize(locale, "Задача создана для группы.", "Task created for the group."),
    );
    await loadData();
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitTaskDraft();
  }

  const canSubmitTaskDraft =
    taskDraft.title.trim().length > 0 &&
    (taskDraft.targetMode === "employees"
      ? taskDraft.assigneeEmployeeIds.length > 0
      : Boolean(taskDraft.groupId.trim())) &&
    (taskDraft.mode === "task" ||
      (Boolean(taskDraft.dueAt) &&
        (taskDraft.meetingMode === "online"
          ? Boolean(taskDraft.meetingLink.trim())
          : Boolean(taskDraft.meetingLocation.trim()))));
  const minTaskDateTime = formatDateTimeLocalInput(new Date());
  const selectedPriorityOption =
    priorityOptions.find((item) => item.value === taskDraft.priority) ??
    priorityOptions[2];

  function toggleTaskAssignee(employeeId: string, checked: boolean) {
    setTaskDraft((current) => ({
      ...current,
      assigneeEmployeeIds: checked
        ? Array.from(new Set([...current.assigneeEmployeeIds, employeeId]))
        : current.assigneeEmployeeIds.filter((id) => id !== employeeId),
    }));
  }

  return (
    <AdminShell
      initialSession={session}
      mode={mode}
      onCreateAction={
        isEmployeeMode
          ? undefined
          : () => {
              setTaskDraft(initialTaskDraft);
              setTaskDayOffConfirmOpen(false);
              setCreateTaskOpen(true);
            }
      }
    >
      <main className="page-shell manager-page-shell">
        <section className="manager-home">
          <Dialog
            onOpenChange={(open) => {
              setCreateTaskOpen(open);
              if (!open) {
                setTaskDayOffConfirmOpen(false);
              }
            }}
            open={createTaskOpen}
          >
            <DialogContent className="manager-create-dialog">
                  <DialogHeader>
                    <DialogTitle>
                      {taskDraft.mode === "meeting"
                        ? localize(locale, "Новая встреча", "New meeting")
                        : localize(locale, "Новая задача", "New task")}
                    </DialogTitle>
                    <DialogDescription>
                      {taskDraft.mode === "meeting"
                        ? localize(
                            locale,
                            "Назначьте встречу сотрудникам, добавьте время, ссылку или место встречи.",
                            "Assign a meeting to employees and add time, a link or a location.",
                          )
                        : localize(
                            locale,
                            "Создайте задачу для сотрудников или сразу для целой группы.",
                            "Create a task for employees or for an entire group at once.",
                          )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="manager-create-mode">
                    <button
                      className={
                        taskDraft.mode === "task" ? "is-active" : undefined
                      }
                      onClick={() =>
                        setTaskDraft((c) => ({ ...c, mode: "task" }))
                      }
                      type="button"
                    >
                      <CheckSquare className="size-4" /> {localize(locale, "Создать задачу", "Create task")}
                    </button>
                    <button
                      className={
                        taskDraft.mode === "meeting" ? "is-active" : undefined
                      }
                      onClick={() =>
                        setTaskDraft((c) => ({ ...c, mode: "meeting" }))
                      }
                      type="button"
                    >
                      <CalendarDays className="size-4" /> {localize(locale, "Создать встречу", "Create meeting")}
                    </button>
                  </div>
                  <form
                    className="manager-task-form"
                    onSubmit={handleCreateTask}
                  >
                    <Input
                      onChange={(e) =>
                        setTaskDraft((c) => ({ ...c, title: e.target.value }))
                      }
                      placeholder={
                        taskDraft.mode === "meeting"
                          ? localize(locale, "Тема встречи", "Meeting title")
                          : localize(locale, "Что нужно сделать", "What needs to be done")
                      }
                      value={taskDraft.title}
                    />
                    <div className="manager-form-block">
                      <div className="manager-form-block-head">
                        <strong>
                          {taskDraft.targetMode === "employees"
                            ? localize(locale, "Сотрудники", "Employees")
                            : localize(locale, "Группа", "Group")}
                        </strong>
                        <span>
                          {taskDraft.targetMode === "employees"
                            ? localize(
                                locale,
                                `Выбрано ${taskDraft.assigneeEmployeeIds.length}`,
                                `Selected ${taskDraft.assigneeEmployeeIds.length}`,
                              )
                            : taskDraft.groupId
                              ? localize(locale, "Группа выбрана", "Group selected")
                              : localize(locale, "Не выбрано", "Not selected")}
                        </span>
                      </div>
                      <div className="manager-create-mode manager-create-mode--compact">
                        <button
                          className={
                            taskDraft.targetMode === "employees"
                              ? "is-active"
                              : undefined
                          }
                          onClick={() =>
                            setTaskDraft((c) => ({
                              ...c,
                              targetMode: "employees",
                              groupId: "",
                            }))
                          }
                          type="button"
                        >
                          {localize(locale, "Сотрудники", "Employees")}
                        </button>
                        <button
                          className={
                            taskDraft.targetMode === "group"
                              ? "is-active"
                              : undefined
                          }
                          onClick={() =>
                            setTaskDraft((c) => ({
                              ...c,
                              targetMode: "group",
                              assigneeEmployeeIds: [],
                            }))
                          }
                          type="button"
                        >
                          {localize(locale, "Группа", "Group")}
                        </button>
                      </div>
                      {taskDraft.targetMode === "employees" ? (
                        <div className="manager-assignee-picker">
                          {employees.map((employee) => {
                            const isSelected =
                              taskDraft.assigneeEmployeeIds.includes(employee.id);
                            const employeeName =
                              `${employee.firstName} ${employee.lastName}`.trim();
                            return (
                              <label
                                className={`manager-assignee-option${isSelected ? " is-selected" : ""}`}
                                key={employee.id}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    toggleTaskAssignee(
                                      employee.id,
                                      checked === true,
                                    )
                                  }
                                />
                                <img
                                  alt={employeeName}
                                  className="h-10 w-10 rounded-full object-cover shadow-[0_8px_20px_rgba(40,75,255,0.12)]"
                                  src={
                                    employee.avatarUrl ||
                                    getMockAvatarDataUrl(employeeName)
                                  }
                                />
                                <span className="manager-assignee-copy">
                                  <strong>{employeeName}</strong>
                                  <span>
                                    {employee.department?.name ??
                                      localize(locale, "Команда", "Team")}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : groups.length ? (
                        <Select
                          onValueChange={(value) =>
                            setTaskDraft((c) => ({ ...c, groupId: value }))
                          }
                          value={taskDraft.groupId}
                        >
                          <SelectTrigger>
                            <SelectTriggerLabel>
                              <SelectValue placeholder={localize(locale, "Выберите группу", "Select a group")} />
                            </SelectTriggerLabel>
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                <SelectOptionContent>
                                  <SelectOptionText>
                                    <SelectOptionTitle>
                                      {group.name}
                                    </SelectOptionTitle>
                                    <SelectOptionDescription data-select-description>
                                      {group.memberships.length
                                        ? localize(
                                            locale,
                                            `${group.memberships.length} участников`,
                                            `${group.memberships.length} members`,
                                          )
                                        : localize(locale, "Без участников", "No members")}
                                    </SelectOptionDescription>
                                  </SelectOptionText>
                                </SelectOptionContent>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                          {localize(locale, "Группы ещё не созданы.", "Groups have not been created yet.")}
                        </div>
                      )}
                    </div>
                    <Textarea
                      onChange={(e) =>
                        setTaskDraft((c) => ({
                          ...c,
                          description: e.target.value,
                        }))
                      }
                      placeholder={
                        taskDraft.mode === "meeting"
                          ? localize(
                              locale,
                              "Что обсудить и что нужно подготовить",
                              "What should be discussed and prepared",
                            )
                          : localize(locale, "Короткое описание задачи", "Short task description")
                      }
                      value={taskDraft.description}
                    />
                    <div className="manager-task-form-grid">
                      <Select
                        onValueChange={(v) =>
                          setTaskDraft((c) => ({
                            ...c,
                            priority: v as TaskItem["priority"],
                          }))
                        }
                        value={taskDraft.priority}
                      >
                        <SelectTrigger>
                          {selectedPriorityOption ? (
                            <SelectOptionContent>
                              <SelectOptionIcon>
                                {selectedPriorityOption.icon}
                              </SelectOptionIcon>
                              <SelectOptionText>
                                <SelectOptionTitle>
                                  {selectedPriorityOption.label}
                                </SelectOptionTitle>
                                <SelectOptionDescription
                                  data-select-description
                                >
                                  {selectedPriorityOption.description}
                                </SelectOptionDescription>
                              </SelectOptionText>
                            </SelectOptionContent>
                          ) : (
                            <SelectTriggerLabel>
                              <SelectValue placeholder={localize(locale, "Приоритет", "Priority")} />
                            </SelectTriggerLabel>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              <SelectOptionContent>
                                <SelectOptionIcon>{p.icon}</SelectOptionIcon>
                                <SelectOptionText>
                                  <SelectOptionTitle>
                                    {p.label}
                                  </SelectOptionTitle>
                                  <SelectOptionDescription
                                    data-select-description
                                  >
                                    {p.description}
                                  </SelectOptionDescription>
                                </SelectOptionText>
                              </SelectOptionContent>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        onChange={(e) =>
                          setTaskDraft((c) => ({ ...c, dueAt: e.target.value }))
                        }
                        min={minTaskDateTime}
                        placeholder={
                          taskDraft.mode === "meeting"
                            ? localize(locale, "Дата и время встречи", "Meeting date and time")
                            : localize(locale, "Срок", "Due date")
                        }
                        type="datetime-local"
                        value={taskDraft.dueAt}
                      />
                    </div>
                    {taskDraft.mode === "task" ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
                            <Checkbox
                              checked={taskDraft.isRecurring}
                              onCheckedChange={(checked) =>
                                setTaskDraft((current) => ({
                                  ...current,
                                  isRecurring: checked === true,
                                }))
                              }
                            />
                            <span className="whitespace-nowrap text-sm font-heading leading-none">
                              {localize(locale, "Сделать регулярной задачей", "Make recurring")}
                            </span>
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
                            <Checkbox
                              checked={taskDraft.requiresPhoto}
                              onCheckedChange={(checked) =>
                                setTaskDraft((current) => ({
                                  ...current,
                                  requiresPhoto: checked === true,
                                }))
                              }
                            />
                            <span className="whitespace-nowrap text-sm font-heading leading-none">
                              {localize(locale, "Требуется фото-подтверждение", "Photo confirmation required")}
                            </span>
                          </label>
                        </div>
                        {taskDraft.isRecurring ? (
                          <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-secondary/10 p-4 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-heading">
                              <span>{localize(locale, "Периодичность", "Frequency")}</span>
                              <Select
                                onValueChange={(value) =>
                                  setTaskDraft((current) => ({
                                    ...current,
                                    frequency: value as "DAILY" | "WEEKLY" | "MONTHLY",
                                  }))
                                }
                                value={taskDraft.frequency}
                              >
                                <SelectTrigger>
                                  <SelectTriggerLabel>
                                    <SelectValue
                                      placeholder={localize(
                                        locale,
                                        "Выберите периодичность",
                                        "Select frequency",
                                      )}
                                    />
                                  </SelectTriggerLabel>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DAILY">{localize(locale, "Ежедневно", "Daily")}</SelectItem>
                                  <SelectItem value="WEEKLY">{localize(locale, "Еженедельно", "Weekly")}</SelectItem>
                                  <SelectItem value="MONTHLY">{localize(locale, "Ежемесячно", "Monthly")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </label>
                            <label className="grid gap-2 text-sm font-heading">
                              <span>{localize(locale, "Начало", "Start date")}</span>
                              <Input
                                className="h-11"
                                onChange={(event) =>
                                  setTaskDraft((current) => ({
                                    ...current,
                                    startDate: event.target.value,
                                  }))
                                }
                                type="date"
                                value={taskDraft.startDate}
                              />
                            </label>
                            {taskDraft.frequency === "WEEKLY" ? (
                              <label className="col-span-full grid gap-2 text-sm font-heading">
                                <span>{localize(locale, "Дни недели", "Weekdays")}</span>
                                <div className="flex flex-wrap gap-2">
                                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                                    const label = getWeekdayShortLabel(day, locale);
                                    const isSelected =
                                      taskDraft.weekDays.includes(day);

                                    return (
                                      <button
                                        className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                                          isSelected
                                            ? "bg-[color:var(--primary)] text-white"
                                            : "bg-secondary text-foreground hover:bg-secondary/80"
                                        }`}
                                        key={day}
                                        onClick={() =>
                                          setTaskDraft((current) => ({
                                            ...current,
                                            weekDays: isSelected
                                              ? current.weekDays.filter((d) => d !== day)
                                              : [...current.weekDays, day].sort(),
                                          }))
                                        }
                                        type="button"
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </label>
                            ) : null}
                            <label className="col-span-full grid gap-2 text-sm font-heading">
                              <span>{localize(locale, "Дата окончания (необязательно)", "End date (optional)")}</span>
                              <Input
                                className="h-11"
                                onChange={(event) =>
                                  setTaskDraft((current) => ({
                                    ...current,
                                    endDate: event.target.value,
                                  }))
                                }
                                type="date"
                                value={taskDraft.endDate || ""}
                              />
                            </label>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {canCheckWorkdays &&
                    taskDraft.dueAt &&
                    selectedAssigneeDayStatuses.length ? (
                      <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <strong className="font-heading text-sm text-[color:var(--foreground)]">
                            {localize(locale, "Рабочий день сотрудников", "Employees' workday")}
                          </strong>
                          <span className="text-xs font-heading text-[color:var(--muted-foreground)]">
                            {formatWorkdayDateLabel(
                              selectedAssigneeDayStatuses[0].dayKey,
                              locale,
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedAssigneeDayStatuses.map((item) => (
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-heading ${
                                item.isWorkday
                                  ? "bg-[color:var(--soft-success)] text-[color:var(--success)]"
                                  : "bg-[color:var(--soft-warning)] text-[color:var(--warning)]"
                              }`}
                              key={item.employeeId}
                            >
                              {item.name}:{" "}
                              {item.isWorkday
                                ? localize(locale, "рабочий день", "workday")
                                : localize(locale, "выходной день", "day off")}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {taskDraft.mode === "meeting" ? (
                      <>
                        <div className="manager-create-mode manager-create-mode--compact">
                          <button
                            className={
                              taskDraft.meetingMode === "online"
                                ? "is-active"
                                : undefined
                            }
                            onClick={() =>
                              setTaskDraft((c) => ({
                                ...c,
                                meetingMode: "online",
                              }))
                            }
                            type="button"
                          >
                            {localize(locale, "Онлайн", "Online")}
                          </button>
                          <button
                            className={
                              taskDraft.meetingMode === "offline"
                                ? "is-active"
                                : undefined
                            }
                            onClick={() =>
                              setTaskDraft((c) => ({
                                ...c,
                                meetingMode: "offline",
                              }))
                            }
                            type="button"
                          >
                            {localize(locale, "Оффлайн", "Offline")}
                          </button>
                        </div>
                        {taskDraft.meetingMode === "online" ? (
                          <Input
                            onChange={(e) =>
                              setTaskDraft((c) => ({
                                ...c,
                                meetingLink: e.target.value,
                              }))
                            }
                            placeholder={localize(
                              locale,
                              "Ссылка на Google Meet / Zoom / Teams",
                              "Google Meet / Zoom / Teams link",
                            )}
                            value={taskDraft.meetingLink}
                          />
                        ) : (
                          <Input
                            onChange={(e) =>
                              setTaskDraft((c) => ({
                                ...c,
                                meetingLocation: e.target.value,
                              }))
                            }
                            placeholder={localize(
                              locale,
                              "Кабинет, переговорка или кафе",
                              "Room, meeting space or cafe",
                            )}
                            value={taskDraft.meetingLocation}
                          />
                        )}
                      </>
                    ) : null}
                    <div className="manager-task-form-actions">
                      <span className="manager-form-hint">
                        {taskDraft.mode === "meeting"
                          ? localize(
                              locale,
                              "Встреча придет сотрудникам как задача, чтобы ее можно было отметить выполненной или вернуть обратно.",
                              "The meeting will arrive to employees as a task so it can be marked as completed or returned.",
                            )
                          : localize(
                              locale,
                              "Сотрудники увидят задачу в разделе «Мои задачи» и смогут отметить ее выполненной.",
                              "Employees will see the task in My tasks and will be able to mark it as completed.",
                            )}
                      </span>
                      <Button disabled={!canSubmitTaskDraft} type="submit">
                        {taskDraft.mode === "meeting"
                          ? localize(locale, "Создать встречу", "Create meeting")
                          : localize(locale, "Создать задачу", "Create task")}
                      </Button>
                    </div>
                  </form>
            </DialogContent>
          </Dialog>

          <Dialog
            onOpenChange={setTaskDayOffConfirmOpen}
            open={taskDayOffConfirmOpen}
          >
            <DialogContent className="max-w-[460px]">
              <DialogHeader>
                <DialogTitle>
                  {localize(locale, "Выходной день сотрудника", "Employee day off")}
                </DialogTitle>
                <DialogDescription>
                  {taskDraft.mode === "meeting"
                    ? hasDayOffAssignee
                      ? localize(
                          locale,
                          "У сотрудника выходной день. Вы хотите назначить встречу на этот день?",
                          "The employee has a day off. Do you want to schedule the meeting for this day?",
                        )
                      : localize(locale, "Подтвердите создание встречи.", "Confirm meeting creation.")
                    : hasDayOffAssignee
                      ? localize(
                          locale,
                          "У сотрудника выходной день. Вы хотите назначить задачу на этот день?",
                          "The employee has a day off. Do you want to assign the task for this day?",
                        )
                      : localize(locale, "Подтвердите создание задачи.", "Confirm task creation.")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 text-sm text-[color:var(--muted-foreground)]">
                {selectedAssigneeDayStatuses
                  .filter((item) => !item.isWorkday)
                  .map((item) => (
                    <span
                      className="rounded-full bg-[color:var(--soft-warning)] px-3 py-1.5 font-heading text-[color:var(--warning)]"
                      key={item.employeeId}
                    >
                      {item.name}
                    </span>
                  ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setTaskDayOffConfirmOpen(false)}
                  variant="outline"
                >
                  {localize(locale, "Поменять день", "Change day")}
                </Button>
                <Button
                  onClick={() => {
                    setTaskDayOffConfirmOpen(false);
                    void submitTaskDraft(true);
                  }}
                >
                  {localize(locale, "Да", "Yes")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            onOpenChange={(open) => {
              if (!open) {
                setSelectedCalendarEvent(null);
              }
            }}
            open={Boolean(selectedCalendarEvent)}
          >
            <DialogContent className="manager-event-dialog">
              {selectedCalendarEvent ? (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedCalendarEvent.kind === "meeting"
                        ? localize(locale, "Встреча", "Meeting")
                        : localize(locale, "Задача", "Task")}
                      :{" "}
                      {selectedCalendarEvent.displayTitle}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedCalendarEvent.date.toLocaleDateString(toIntlLocale(locale), {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {selectedCalendarEvent.time
                        ? ` · ${selectedCalendarEvent.time}`
                        : ` · ${localize(locale, "выполнено", "completed")}`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="manager-event-dialog-body">
                    <div className="manager-event-dialog-grid">
                      <div className="manager-event-card">
                        <span>{localize(locale, "Тип", "Type")}</span>
                        <strong>
                          {selectedCalendarEvent.kind === "meeting"
                            ? localize(locale, "Встреча", "Meeting")
                            : localize(locale, "Задача", "Task")}
                        </strong>
                      </div>
                      <div className="manager-event-card">
                        <span>
                          {selectedCalendarEvent.kind === "meeting"
                            ? localize(locale, "Участники", "Participants")
                            : localize(locale, "Исполнители", "Assignees")}
                        </span>
                        <strong>{selectedCalendarEvent.tooltipLabel}</strong>
                      </div>
                    </div>
                    {selectedCalendarEvent.description ? (
                      <div className="manager-event-copy">
                        <span>{localize(locale, "Описание", "Description")}</span>
                        <p>{selectedCalendarEvent.description}</p>
                      </div>
                    ) : null}
                    <div className="manager-event-copy">
                      <span>
                        {selectedCalendarEvent.kind === "meeting"
                          ? localize(locale, "Кто участвует", "Participants")
                          : localize(locale, "Кто назначен", "Assigned to")}
                      </span>
                      <p>{selectedCalendarEvent.participants.join(", ")}</p>
                    </div>
                    {selectedCalendarEvent.meetingLocation ? (
                      <div className="manager-event-copy">
                        <span>{localize(locale, "Место", "Location")}</span>
                        <p>{selectedCalendarEvent.meetingLocation}</p>
                      </div>
                    ) : null}
                    {selectedCalendarEvent.meetingLink ? (
                      <div className="manager-event-copy">
                        <span>{localize(locale, "Ссылка", "Link")}</span>
                        <p>{selectedCalendarEvent.meetingLink}</p>
                      </div>
                    ) : null}
                    <div className="manager-event-dialog-actions">
                      <Button
                        onClick={() =>
                          router.push(
                            `/schedule?date=${selectedCalendarEvent.date.toISOString().slice(0, 10)}&eventType=${
                              selectedCalendarEvent.kind === "meeting" ? "meetings" : "tasks"
                            }`,
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        {localize(locale, "Открыть в календаре", "Open in calendar")}
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          <div
            className={`dashboard-layout${isEmployeeMode ? " dashboard-layout--employee" : ""}`}
          >
            <aside className="dashboard-tasks-rail">
              <DashboardTasksSidebar
                locale={locale}
                onTaskToggle={(taskId, nextDone) =>
                  void handleTaskStatus(taskId, nextDone ? "DONE" : "TODO")
                }
                tasks={personalTasks}
              />
            </aside>

            <div className="dashboard-main-card">
              {managerOnly || isEmployeeMode ? (
                <ManagerPerformancePanel
                  history={personalHistory}
                  locale={locale}
                  tasks={personalTasks}
                />
              ) : (
                <div className="dashboard-actions-center-shell">
                  <ActionCenter
                    items={isDemoSession ? undefined : actionCenterItems}
                    locale={locale}
                    useMockData={isDemoSession}
                  />
                </div>
              )}
            </div>

            <div className="dashboard-calendar-card">
              <div className="manager-week-shell">
                <div className="manager-week-grid manager-week-grid--bottom">
                  {weeklyCalendar.map((day) => (
                    <article
                      className={`manager-week-day${day.tasks.length ? " has-tasks" : ""}`}
                      key={day.label}
                    >
                      <div className="manager-week-day-head">
                        <div className="manager-week-day-copy">
                          <span className="manager-week-day-weekday">
                            {day.weekdayLongLabel}
                          </span>
                          <strong>{day.monthLabel}</strong>
                          {day.tasks.length > 0 && (
                            <span className="manager-week-day-count">
                              {day.taskCountLabel}
                            </span>
                          )}
                        </div>
                        <div className="manager-week-day-date">
                          <strong>{day.dateNumber}</strong>
                        </div>
                      </div>
                      {day.tasks.length ? (
                        <div className="manager-week-day-list">
                          {day.tasks.map((task) => (
                            <button
                              className={`manager-week-task${task.isCompleted ? " is-done" : ""}`}
                              key={task.id}
                              onClick={() => setSelectedCalendarEvent(task)}
                              type="button"
                            >
                              {task.time ? (
                                <span className="manager-week-task-time">
                                  {task.time}
                                </span>
                              ) : null}
                              <span className="manager-week-task-title">
                                {task.displayTitle}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="manager-week-empty">
                          {localize(locale, "СОБЫТИЙ НЕТ", "NO EVENTS")}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {!isEmployeeMode ? (
              <aside className="dashboard-birthdays-rail">
                <DashboardBirthdaysSidebar items={birthdaysItems} locale={locale} />
              </aside>
            ) : null}
          </div>

          {message ? (
            <div className="dashboard-toast" role="status">
              <span>{message}</span>
              {messageAction ? (
                <Button
                  className="dashboard-toast-action"
                  onClick={() => router.push(messageAction.href)}
                  type="button"
                  variant="outline"
                >
                  {messageAction.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </AdminShell>
  );
}
