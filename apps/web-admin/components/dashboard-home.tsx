"use client";

import {
  FormEvent,
  type ReactNode,
  useId,
  useEffect,
  useMemo,
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
  hasDesktopAdminAccess,
  isEmployeeOnlyRole,
  isManagerOnlyRole,
} from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { createAttendanceLiveSocket } from "@/lib/attendance-socket";
import { isDemoAccessToken } from "@/lib/demo-mode";
import {
  buildEmployeeWorkdayLookup,
  formatWorkdayDateLabel,
  getEmployeeWorkdayStatus,
  type EmployeeScheduleShift,
} from "@/lib/employee-workdays";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";
import { appendTaskMeta, parseTaskMeta } from "@/lib/task-meta";
import { ActionCenter } from "@/components/ActionsCenter";
import { ManagerPerformancePanel } from "@/components/dashboard/ManagerPerformancePanel";
import { TasksSidebar as DashboardTasksSidebar } from "@/components/dashboard/TasksSidebar";
import { BirthdaysSidebar as DashboardBirthdaysSidebar } from "@/components/dashboard/BirthdaysSidebar";

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

type AttendanceFilterKey =
  | "all"
  | "present"
  | "absent"
  | "late"
  | "checked"
  | "issues";

const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;

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

const priorityOptions: Array<{
  value: TaskItem["priority"];
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "URGENT",
    label: "Urgent",
    description: "Немедленное выполнение",
    icon: <AlertCircle className="size-4 text-[#b42318]" />,
  },
  {
    value: "HIGH",
    label: "High",
    description: "Высокий приоритет",
    icon: <ArrowUp className="size-4 text-[#d97706]" />,
  },
  {
    value: "MEDIUM",
    label: "Medium",
    description: "Стандартная задача",
    icon: <Minus className="size-4 text-[#2563eb]" />,
  },
  {
    value: "LOW",
    label: "Low",
    description: "Можно выполнить позже",
    icon: <ArrowDown className="size-4 text-[#0f9b65]" />,
  },
];

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ru-RU", {
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

function formatDayHeader(value: Date) {
  return value.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatMonthLabel(value: Date) {
  return value
    .toLocaleDateString("ru-RU", { month: "long" })
    .replace(/\.$/, "")
    .toUpperCase();
}

function formatWeekdayLabel(value: Date) {
  return value
    .toLocaleDateString("ru-RU", { weekday: "short" })
    .replace(/\.$/, "")
    .toUpperCase();
}

function getAttendanceArrivalLabel(session: AttendanceLiveSession | undefined) {
  if (!session) return "Отсутствует";
  if (session.lateMinutes > 0) return `Опоздание +${session.lateMinutes} мин`;
  if (session.status === "on_break") return "На перерыве";
  if (session.status === "checked_out") return "Завершил смену";
  return "Вовремя";
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

function stripMeetingPrefix(title: string) {
  return title.replace(/^Встреча:\s*/i, "").trim();
}

function formatTaskCountLabel(count: number) {
  if (count === 1) return "1 задача";
  if (count >= 2 && count <= 4) return `${count} задачи`;
  return `${count} задач`;
}

function formatParticipantSummary(names: string[], kind: "meeting" | "task") {
  if (names.length === 0) {
    return kind === "meeting" ? "Без участников" : "Без исполнителей";
  }
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} и ещё ${names.length - 2}`;
}

function formatParticipantLabel(count: number, kind: "meeting" | "task") {
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
): TaskItem[] {
  const managerRef = {
    id: "mock-manager",
    firstName: "Анна",
    lastName: "Крылова",
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
        firstName: "Алексей",
        lastName: "Соколов",
        employeeNumber: "0001",
        department: { id: "dept-ops", name: "Операции" },
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
      "Проверить табель за первую половину месяца",
      "Сверить отметки прихода и подготовить комментарии по отклонениям.",
      createMockTaskDate(0, 10, 30),
      "HIGH",
    ),
    buildTask(
      "mock-task-2",
      "Встреча: Ежедневный синк по сменам",
      appendTaskMeta("Обсуждение покрытия вечерних смен и замен на выходные.", {
        kind: "meeting",
        meetingMode: "offline",
        meetingLocation: "Переговорная B",
      }) ?? null,
      createMockTaskDate(0, 15, 0),
      "MEDIUM",
      "IN_PROGRESS",
    ),
    buildTask(
      "mock-task-3",
      "Подготовить список сотрудников на обучение",
      "Собрать кандидатов на апрельское внутреннее обучение и согласовать отделы.",
      createMockTaskDate(1, 11, 15),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4",
      "Встреча: Разбор опозданий за неделю",
      appendTaskMeta("Короткий созвон с HR по повторяющимся опозданиям.", {
        kind: "meeting",
        meetingMode: "online",
        meetingLink: "https://meet.example.com/attendance-review",
      }) ?? null,
      createMockTaskDate(2, 16, 0),
      "URGENT",
    ),
    buildTask(
      "mock-task-4a",
      "Проверить подтверждение смен на вечер",
      "Проверить, кто подтвердил вечерние смены на пятницу, и закрыть незаполненные слоты.",
      createMockTaskDate(2, 10, 0),
      "HIGH",
    ),
    buildTask(
      "mock-task-4b",
      "Собрать причины опозданий по группе А",
      "Сверить объяснительные и обновить комментарии в табеле перед встречей с HR.",
      createMockTaskDate(2, 11, 30),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4c",
      "Проверить готовность формы отчета",
      "Убедиться, что шаблон отчета по посещаемости заполнен и готов к отправке руководителю.",
      createMockTaskDate(2, 13, 15),
      "LOW",
    ),
    buildTask(
      "mock-task-4d",
      "Согласовать подмену на субботу",
      "Связаться с сотрудниками по субботней смене и зафиксировать финальную подмену в расписании.",
      createMockTaskDate(2, 14, 40),
      "HIGH",
    ),
    buildTask(
      "mock-task-4e",
      "Подготовить комментарии по смене 19 марта",
      "Собрать замечания по фактическим отметкам и вынести короткое резюме для менеджера смены.",
      createMockTaskDate(2, 15, 20),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-4f",
      "Проверить закрытие ночного слота",
      "Убедиться, что ночной слот на пятницу подтвержден и сотрудник получил уведомление.",
      createMockTaskDate(2, 17, 10),
      "HIGH",
    ),
    buildTask(
      "mock-task-4g",
      "Обновить список контактов дежурной группы",
      "Сверить телефоны и мессенджеры по дежурной группе перед выходными.",
      createMockTaskDate(2, 18, 5),
      "LOW",
    ),
    buildTask(
      "mock-task-4h",
      "Подтвердить готовность подменного состава",
      "Проверить, что резерв на конец недели назначен и видит своё расписание.",
      createMockTaskDate(3, 9, 20),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-5",
      "Проверить готовность графика на выходные",
      "Убедиться, что все слоты закрыты и нет пересечений по сменам.",
      createMockTaskDate(4, 9, 45),
      "HIGH",
    ),
    buildTask(
      "mock-task-5a",
      "Сверить список выходящих в субботу",
      "Проверить подтверждения по сотрудникам субботней смены и убрать дубли.",
      createMockTaskDate(4, 11, 0),
      "MEDIUM",
    ),
    buildTask(
      "mock-task-5b",
      "Подготовить короткий отчет по загрузке недели",
      "Собрать по дням количество задач и передать сводку в конце пятницы.",
      createMockTaskDate(4, 12, 25),
      "LOW",
    ),
    buildTask(
      "mock-task-6",
      "Встреча: 1-on-1 по итогам недели",
      appendTaskMeta("Поговорить о загрузке, качестве смен и точках роста.", {
        kind: "meeting",
        meetingMode: "offline",
        meetingLocation: "Кабинет менеджера",
      }) ?? null,
      createMockTaskDate(5, 13, 30),
      "LOW",
    ),
    buildTask(
      "mock-task-7",
      "Собрать просроченные подтверждения смен",
      "Есть неподтверждённые слоты за вчера, нужно быстро закрыть вопрос.",
      createMockTaskDate(-1, 18, 0),
      "URGENT",
    ),
  ];
}

export default function DashboardHome({
  mode = "admin",
}: {
  mode?: "admin" | "employee";
}) {
  const router = useRouter();
  const session = getSession();
  const isDemoSession = isDemoAccessToken(session?.accessToken);
  const isEmployeeMode =
    mode === "employee" || isEmployeeOnlyRole(session?.user.roleCodes ?? []);
  const dashboardCacheKey = useMemo(
    () => (session ? buildDashboardCacheKey(session, isEmployeeMode) : null),
    [isEmployeeMode, session],
  );
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>([]);
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    null,
  );
  const [requests, setRequests] = useState<ApprovalInboxItem[]>([]);
  const [taskBoard, setTaskBoard] =
    useState<CollaborationTaskBoardResponse | null>(null);
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [groups, setGroups] = useState<WorkGroupItem[]>([]);
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
    [],
  );
  const [canCheckWorkdays, setCanCheckWorkdays] = useState(false);
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<PersonalCalendarEvent | null>(null);
  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilterKey>("all");
  const [personalHistory, setPersonalHistory] =
    useState<AttendanceHistoryResponse | null>(null);
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
    const historyQuery = new URLSearchParams({
      dateFrom: startOfSixMonthWindow(new Date()).toISOString(),
      dateTo: new Date().toISOString(),
    }).toString();

    if (isEmployeeMode) {
      const [taskResult, personalHistoryResult] = await Promise.allSettled([
        apiRequest<TaskItem[]>("/collaboration/tasks/me", {
          token: currentSession.accessToken,
        }),
        apiRequest<AttendanceHistoryResponse>(`/attendance/me/history?${historyQuery}`, {
          token: currentSession.accessToken,
        }),
      ]);

      const employeeTasks =
        taskResult.status === "fulfilled" ? taskResult.value : [];

      setLiveSessions([]);
      setAnomalies(null);
      setRequests([]);
      setEmployees([]);
      setScheduleShifts([]);
      setCanCheckWorkdays(false);
      applyDashboardSnapshot(
        {
          liveSessions: [],
          anomalies: null,
          requests: [],
          employees: [],
          groups: [],
          scheduleShifts: [],
          canCheckWorkdays: false,
          taskBoard: {
            tasks: employeeTasks,
            totals: {
              total: employeeTasks.length,
              overdue: employeeTasks.filter(
                (task) =>
                  task.status !== "DONE" &&
                  Boolean(task.dueAt) &&
                  new Date(task.dueAt as string).getTime() < Date.now(),
              ).length,
              active: employeeTasks.filter((task) => task.status !== "DONE").length,
              done: employeeTasks.filter((task) => task.status === "DONE").length,
            },
          },
          personalHistory:
            personalHistoryResult.status === "fulfilled"
              ? personalHistoryResult.value
              : null,
        },
        dashboardCacheKey,
      );
      return;
    }

    const [
      liveResult,
      anomalyResult,
      requestResult,
      taskResult,
      employeeResult,
      groupsResult,
      shiftsResult,
      personalHistoryResult,
    ] = await Promise.allSettled([
      apiRequest<AttendanceLiveSession[]>("/attendance/team/live", {
        token: currentSession.accessToken,
      }),
      apiRequest<AttendanceAnomalyResponse>("/attendance/team/anomalies", {
        token: currentSession.accessToken,
      }),
      apiRequest<ApprovalInboxItem[]>("/requests/inbox", {
        token: currentSession.accessToken,
      }),
      apiRequest<CollaborationTaskBoardResponse>("/collaboration/tasks", {
        token: currentSession.accessToken,
      }),
      apiRequest<EmployeeDirectoryItem[]>("/employees", {
        token: currentSession.accessToken,
      }),
      apiRequest<WorkGroupItem[]>("/collaboration/groups", {
        token: currentSession.accessToken,
      }).catch(() => []),
      apiRequest<EmployeeScheduleShift[]>("/schedule/shifts", {
        token: currentSession.accessToken,
      }),
      apiRequest<AttendanceHistoryResponse>(`/attendance/me/history?${historyQuery}`, {
        token: currentSession.accessToken,
      }),
    ]);

    applyDashboardSnapshot(
      {
        liveSessions: liveResult.status === "fulfilled" ? liveResult.value : [],
        anomalies:
          anomalyResult.status === "fulfilled" ? anomalyResult.value : null,
        requests:
          requestResult.status === "fulfilled" ? requestResult.value : [],
        taskBoard: taskResult.status === "fulfilled" ? taskResult.value : null,
        employees:
          employeeResult.status === "fulfilled" ? employeeResult.value : [],
        groups: groupsResult.status === "fulfilled" ? groupsResult.value : [],
        scheduleShifts:
          shiftsResult.status === "fulfilled" ? shiftsResult.value : [],
        canCheckWorkdays: shiftsResult.status === "fulfilled",
        personalHistory:
          personalHistoryResult.status === "fulfilled"
            ? personalHistoryResult.value
            : null,
      },
      dashboardCacheKey,
    );
  }

  useEffect(() => {
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
  }, [dashboardCacheKey, isEmployeeMode]);

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

    const mockTasks = createMockDashboardTasks(managerEmployee).map((task) => ({
      ...task,
      status: mockTaskStatuses[task.id] ?? task.status,
      completedAt:
        (mockTaskStatuses[task.id] ?? task.status) === "DONE"
          ? new Date().toISOString()
          : null,
    }));
    return [...apiTasks, ...mockTasks];
  }, [isDemoSession, managerEmployee, mockTaskStatuses, taskBoard?.tasks]);
  const personalTasks = useMemo(() => {
    if (isEmployeeMode) {
      return dashboardTasks;
    }

    const tasks = dashboardTasks;
    if (!managerEmployee) return tasks;
    return tasks.filter((task) => task.assigneeEmployeeId === managerEmployee.id);
  }, [dashboardTasks, isEmployeeMode, managerEmployee]);
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
  const issueItems = anomalies?.items ?? [];
  const issuePreview = showAllIssues ? issueItems : issueItems.slice(0, 4);
  const birthdays = employees
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
      department: item.employee.department?.name ?? "Команда",
      dateLabel: item.nextDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      }),
      avatarUrl:
        item.employee.avatarUrl ||
        getMockAvatarDataUrl(
          `${item.employee.firstName} ${item.employee.lastName}`.trim(),
        ),
    }));
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
    { key: "all", label: "Все", value: employees.length },
    {
      key: "present",
      label: "Пришли",
      value: presentCount,
    },
    {
      key: "absent",
      label: "Отсутствуют",
      value: absentCount,
    },
    {
      key: "late",
      label: "Опоздание",
      value: stats.late,
    },
    {
      key: "checked",
      label: "Завершили",
      value: stats.checkedOut,
    },
    {
      key: "issues",
      label: "Без отметки",
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
        schedule: session?.shiftLabel ?? "Нет расписания",
        arrival: getAttendanceArrivalLabel(session),
        arrivalTone: getAttendanceArrivalTone(session),
        departure: session?.endedAt
          ? formatTime(session.endedAt)
          : session
            ? "В смене"
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
        left.name.localeCompare(right.name, "ru-RU"),
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
        const kind = meta.meeting || task.title.startsWith("Встреча:")
          ? "meeting"
          : "task";
        const isCompleted = task.status === "DONE";
        const displayTitle =
          kind === "meeting" ? stripMeetingPrefix(task.title) : task.title;
        const participantName = task.assigneeEmployee
          ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}`
          : task.group?.name ?? "Без исполнителя";
        const eventKey = `${task.dueAt}|${kind}|${isCompleted ? "done" : "open"}|${displayTitle.toLowerCase()}`;
        const existing = eventMap.get(eventKey);

        if (existing) {
          existing.duplicateCount += 1;
          if (!existing.participants.includes(participantName)) {
            existing.participants.push(participantName);
          }
          if (!existing.description && meta.body) {
            existing.description = meta.body;
          }
          if (!existing.meetingLocation && meta.meeting?.meetingLocation) {
            existing.meetingLocation = meta.meeting.meetingLocation;
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
          time: isCompleted ? null : formatTime(task.dueAt),
          kind,
          participants: [participantName],
          duplicateCount: 1,
          description: meta.body,
          meetingLocation: meta.meeting?.meetingLocation ?? null,
          meetingLink: meta.meeting?.meetingLink ?? null,
        });
      });

    const events: PersonalCalendarEvent[] = Array.from(eventMap.values())
      .map((event) => ({
        ...event,
        date,
        participantLabel: formatParticipantSummary(event.participants, event.kind),
        tooltipLabel: formatParticipantLabel(event.participants.length, event.kind),
      }))
      .sort((left, right) => {
        if (left.isCompleted !== right.isCompleted) {
          return left.isCompleted ? 1 : -1;
        }
        if (!left.time && !right.time) return 0;
        if (!left.time) return 1;
        if (!right.time) return -1;
        return left.time.localeCompare(right.time, "ru-RU");
      });

    return {
      date,
      label: formatDayHeader(date),
      monthLabel: formatMonthLabel(date),
      weekdayLabel: formatWeekdayLabel(date),
      weekdayLongLabel: date
        .toLocaleDateString("ru-RU", { weekday: "long" })
        .toUpperCase(),
      dateNumber: date.getDate(),
      taskCountLabel: formatTaskCountLabel(events.length),
      tasks: events,
    };
  });

  async function handleTaskStatus(taskId: string, status: TaskItem["status"]) {
    if (taskId.startsWith("mock-task-")) {
      setMockTaskStatuses((current) => ({ ...current, [taskId]: status }));
      setMessageAction(null);
      setMessage(
        status === "DONE"
          ? "Mock-задача отмечена как выполненная."
          : "Статус mock-задачи обновлен.",
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
        ? "Задача отмечена как выполненная."
        : "Статус задачи обновлен.",
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
    setMessage("Запрос подтвержден.");
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
          ? "Выберите хотя бы одного сотрудника."
          : "Выберите группу.",
      );
      return;
    }

    if (taskDraft.dueAt) {
      const dueDate = new Date(taskDraft.dueAt);
      if (Number.isNaN(dueDate.getTime()) || dueDate < new Date()) {
        setMessageAction(null);
        setMessage(
          taskDraft.mode === "meeting"
            ? "Нельзя создать встречу в прошлом."
            : "Нельзя создать задачу с прошедшим сроком.",
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
                  ? `Встреча: ${taskDraft.title}`
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
              ? `Встреча: ${taskDraft.title}`
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
      href: `/app/schedule?date=${(taskDraft.dueAt || new Date().toISOString()).slice(0, 10)}&eventType=${
        taskDraft.mode === "meeting" ? "meetings" : "tasks"
      }`,
      label: "Открыть в календаре",
    });
    setMessage(
      taskDraft.mode === "meeting"
        ? isEmployeeTargetMode
          ? `Встреча создана для ${assigneeEmployeeIds.length} сотрудников.`
          : "Встреча создана для группы."
        : taskDraft.isRecurring
          ? isEmployeeTargetMode
            ? `Шаблон задачи создан для ${assigneeEmployeeIds.length} сотрудников.`
            : "Шаблон задачи создан для группы."
          : isEmployeeTargetMode
            ? `Задача создана для ${assigneeEmployeeIds.length} сотрудников.`
            : "Задача создана для группы.",
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
                        ? "Новая встреча"
                        : "Новая задача"}
                    </DialogTitle>
                    <DialogDescription>
                      {taskDraft.mode === "meeting"
                        ? "Назначьте встречу сотрудникам, добавьте время, ссылку или место встречи."
                        : "Создайте задачу для сотрудников или сразу для целой группы."}
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
                      <CheckSquare className="size-4" /> Создать задачу
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
                      <CalendarDays className="size-4" /> Создать встречу
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
                          ? "Тема встречи"
                          : "Что нужно сделать"
                      }
                      value={taskDraft.title}
                    />
                    <div className="manager-form-block">
                      <div className="manager-form-block-head">
                        <strong>
                          {taskDraft.targetMode === "employees"
                            ? "Сотрудники"
                            : "Группа"}
                        </strong>
                        <span>
                          {taskDraft.targetMode === "employees"
                            ? `Выбрано ${taskDraft.assigneeEmployeeIds.length}`
                            : taskDraft.groupId
                              ? "Группа выбрана"
                              : "Не выбрано"}
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
                          Сотрудники
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
                          Группа
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
                                    {employee.department?.name ?? "Команда"}
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
                              <SelectValue placeholder="Выберите группу" />
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
                                        ? `${group.memberships.length} участников`
                                        : "Без участников"}
                                    </SelectOptionDescription>
                                  </SelectOptionText>
                                </SelectOptionContent>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                          Группы ещё не созданы.
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
                          ? "Что обсудить и что нужно подготовить"
                          : "Короткое описание задачи"
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
                              <SelectValue placeholder="Приоритет" />
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
                            ? "Дата и время встречи"
                            : "Срок"
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
                              Сделать регулярной задачей
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
                              Требуется фото-подтверждение
                            </span>
                          </label>
                        </div>
                        {taskDraft.isRecurring ? (
                          <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-secondary/10 p-4 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-heading">
                              <span>Периодичность</span>
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
                                    <SelectValue placeholder="Выберите периодичность" />
                                  </SelectTriggerLabel>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DAILY">Ежедневно</SelectItem>
                                  <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                                  <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                                </SelectContent>
                              </Select>
                            </label>
                            <label className="grid gap-2 text-sm font-heading">
                              <span>Начало</span>
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
                                <span>Дни недели</span>
                                <div className="flex flex-wrap gap-2">
                                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                                    const label =
                                      day === 0
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
                              <span>Дата окончания (необязательно)</span>
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
                            Рабочий день сотрудников
                          </strong>
                          <span className="text-xs font-heading text-[color:var(--muted-foreground)]">
                            {formatWorkdayDateLabel(
                              selectedAssigneeDayStatuses[0].dayKey,
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
                              {item.isWorkday ? "рабочий день" : "выходной день"}
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
                            Онлайн
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
                            Оффлайн
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
                            placeholder="Ссылка на Google Meet / Zoom / Teams"
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
                            placeholder="Кабинет, переговорка или кафе"
                            value={taskDraft.meetingLocation}
                          />
                        )}
                      </>
                    ) : null}
                    <div className="manager-task-form-actions">
                      <span className="manager-form-hint">
                        {taskDraft.mode === "meeting"
                          ? "Встреча придет сотрудникам как задача, чтобы ее можно было отметить выполненной или вернуть обратно."
                          : "Сотрудники увидят задачу в разделе «Мои задачи» и смогут отметить ее выполненной."}
                      </span>
                      <Button disabled={!canSubmitTaskDraft} type="submit">
                        {taskDraft.mode === "meeting"
                          ? "Создать встречу"
                          : "Создать задачу"}
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
                  Выходной день сотрудника
                </DialogTitle>
                <DialogDescription>
                  {taskDraft.mode === "meeting"
                    ? hasDayOffAssignee
                      ? "У сотрудника выходной день. Вы хотите назначить встречу на этот день?"
                      : "Подтвердите создание встречи."
                    : hasDayOffAssignee
                      ? "У сотрудника выходной день. Вы хотите назначить задачу на этот день?"
                      : "Подтвердите создание задачи."}
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
                  Поменять день
                </Button>
                <Button
                  onClick={() => {
                    setTaskDayOffConfirmOpen(false);
                    void submitTaskDraft(true);
                  }}
                >
                  Да
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
                      {selectedCalendarEvent.kind === "meeting" ? "Встреча" : "Задача"}:{" "}
                      {selectedCalendarEvent.displayTitle}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedCalendarEvent.date.toLocaleDateString("ru-RU", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {selectedCalendarEvent.time
                        ? ` · ${selectedCalendarEvent.time}`
                        : " · выполнено"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="manager-event-dialog-body">
                    <div className="manager-event-dialog-grid">
                      <div className="manager-event-card">
                        <span>Тип</span>
                        <strong>
                          {selectedCalendarEvent.kind === "meeting" ? "Встреча" : "Задача"}
                        </strong>
                      </div>
                      <div className="manager-event-card">
                        <span>
                          {selectedCalendarEvent.kind === "meeting"
                            ? "Участники"
                            : "Исполнители"}
                        </span>
                        <strong>{selectedCalendarEvent.tooltipLabel}</strong>
                      </div>
                    </div>
                    {selectedCalendarEvent.description ? (
                      <div className="manager-event-copy">
                        <span>Описание</span>
                        <p>{selectedCalendarEvent.description}</p>
                      </div>
                    ) : null}
                    <div className="manager-event-copy">
                      <span>
                        {selectedCalendarEvent.kind === "meeting"
                          ? "Кто участвует"
                          : "Кто назначен"}
                      </span>
                      <p>{selectedCalendarEvent.participants.join(", ")}</p>
                    </div>
                    {selectedCalendarEvent.meetingLocation ? (
                      <div className="manager-event-copy">
                        <span>Место</span>
                        <p>{selectedCalendarEvent.meetingLocation}</p>
                      </div>
                    ) : null}
                    {selectedCalendarEvent.meetingLink ? (
                      <div className="manager-event-copy">
                        <span>Ссылка</span>
                        <p>{selectedCalendarEvent.meetingLink}</p>
                      </div>
                    ) : null}
                    <div className="manager-event-dialog-actions">
                      <Button
                        onClick={() =>
                          router.push(
                            `/app/schedule?date=${selectedCalendarEvent.date.toISOString().slice(0, 10)}&eventType=${
                              selectedCalendarEvent.kind === "meeting" ? "meetings" : "tasks"
                            }`,
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        Открыть в календаре
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
                  tasks={personalTasks}
                />
              ) : (
                <div className="dashboard-actions-center-shell">
                  <ActionCenter useMockData={isDemoSession} />
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
                        <p className="manager-week-empty">СОБЫТИЙ НЕТ</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {!isEmployeeMode ? (
              <aside className="dashboard-birthdays-rail">
                <DashboardBirthdaysSidebar items={birthdays} />
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
