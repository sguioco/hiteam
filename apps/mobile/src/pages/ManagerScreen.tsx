import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  AttendanceHistoryResponse,
  AttendanceLiveSession,
  TaskItem,
} from "@smart/types";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { PressableScale } from "../../components/ui/pressable-scale";
import BottomSheetModal from "../components/BottomSheetModal";
import {
  loadManagerEmployees,
  loadManagerLiveSessions,
  loadManagerTasks,
  loadMyProfile,
} from "../../lib/api";
import { getDateLocale, useI18n } from "../../lib/i18n";
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from "../../lib/screen-cache";
import { appendTaskMeta, parseTaskMeta } from "../../lib/task-meta";
import { formatDateKeyInTimeZone } from "../../lib/timezone";
import {
  primeTaskTranslations,
  useTranslatedTaskCopy,
} from "../../lib/use-translated-task-copy";
import { MANAGER_SCREEN_CACHE_KEY, MANAGER_SCREEN_CACHE_TTL_MS } from "../../lib/workspace-cache";

type ManagerEmployee = Awaited<
  ReturnType<typeof loadManagerEmployees>
>[number] & {
  avatar?: any;
};

const MOCK_AVATARS = {
  female: [
    require("../../assets/avatars/1.jpg"),
    require("../../assets/avatars/3.jpg"),
  ],
  male: [
    require("../../assets/avatars/2.jpg"),
    require("../../assets/avatars/4.jpg"),
    require("../../assets/avatars/5.jpg"),
  ],
};

type ManagerScreenProps = {
  active?: boolean;
  standalone?: boolean;
};
type TaskPhoto = {
  id: string;
  label: string;
  capturedAt: string;
  uri: string;
};

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isTaskOpen(status: TaskItem["status"]) {
  return status !== "DONE" && status !== "CANCELLED";
}

function isManagerTaskMeeting(task: TaskItem) {
  return Boolean(parseTaskMeta(task.description).meeting);
}

function normalizeManagerTaskTitle(title: string) {
  return title
    .replace(/^Employee recurring:\s*/i, "")
    .replace(/^Owner recurring:\s*/i, "")
    .trim()
    .toLowerCase();
}

function getManagerTaskAnchorDate(task: TaskItem) {
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

function getManagerTaskDuplicateKey(task: TaskItem, timeZone?: string | null) {
  const anchorDate = getManagerTaskAnchorDate(task);
  const anchorKey = anchorDate
    ? formatDateKeyInTimeZone(anchorDate, timeZone)
    : "no-date";
  const kindKey = isManagerTaskMeeting(task) ? "meeting" : "task";
  const photoKey = task.requiresPhoto ? "photo" : "plain";

  return `${kindKey}|${photoKey}|${normalizeManagerTaskTitle(task.title)}|${anchorKey}|${task.assigneeEmployeeId ?? task.assigneeEmployee?.id ?? "no-assignee"}`;
}

function taskAnchorsManagerDateKey(
  task: TaskItem,
  dateKey: string,
  timeZone?: string | null,
) {
  const anchorDate = getManagerTaskAnchorDate(task);
  if (!anchorDate) {
    return false;
  }

  return formatDateKeyInTimeZone(anchorDate, timeZone) === dateKey;
}

function choosePreferredManagerTask(current: TaskItem, candidate: TaskItem) {
  const currentHasPhotos = current.photoProofs.some(
    (proof) => !proof.deletedAt && !proof.supersededByProofId,
  );
  const candidateHasPhotos = candidate.photoProofs.some(
    (proof) => !proof.deletedAt && !proof.supersededByProofId,
  );

  const currentScore =
    (current.requiresPhoto ? 100 : 0) +
    (currentHasPhotos ? 40 : 0) +
    (!current.isRecurring ? 20 : 0) +
    (current.status !== "DONE" && current.status !== "CANCELLED" ? 10 : 0);

  const candidateScore =
    (candidate.requiresPhoto ? 100 : 0) +
    (candidateHasPhotos ? 40 : 0) +
    (!candidate.isRecurring ? 20 : 0) +
    (candidate.status !== "DONE" && candidate.status !== "CANCELLED" ? 10 : 0);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return new Date(candidate.updatedAt).getTime() >=
    new Date(current.updatedAt).getTime()
    ? candidate
    : current;
}

function collapseDuplicateManagerTasks(
  tasks: TaskItem[],
  timeZone?: string | null,
) {
  const byKey = new Map<string, TaskItem>();

  for (const task of tasks) {
    const key = getManagerTaskDuplicateKey(task, timeZone);
    const current = byKey.get(key);

    if (!current) {
      byKey.set(key, task);
      continue;
    }

    byKey.set(key, choosePreferredManagerTask(current, task));
  }

  return Array.from(byKey.values());
}

function getEmployeeTaskDateKey(
  employee: ManagerEmployee,
  fallbackTimeZone?: string | null,
) {
  return formatDateKeyInTimeZone(
    new Date(),
    employee.primaryLocation?.timezone ?? fallbackTimeZone,
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildTaskPhotos(task: TaskItem, locale: string): TaskPhoto[] {
  const photoLabelPrefix = locale.startsWith("ru") ? "Фото" : "Photo";

  return task.photoProofs
    .filter(
      (proof) => !proof.deletedAt && !proof.supersededByProofId && proof.url,
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
    .map((proof, index) => ({
      id: proof.id,
      label: `${photoLabelPrefix} ${index + 1}`,
      capturedAt: new Date(proof.createdAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      uri: proof.url ?? "",
    }));
}

function buildEmployeeName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function buildManagerEmployeeFromTask(task: TaskItem): ManagerEmployee | null {
  if (!task.assigneeEmployee) {
    return null;
  }

  return {
    id: task.assigneeEmployee.id,
    firstName: task.assigneeEmployee.firstName,
    lastName: task.assigneeEmployee.lastName,
    email: "",
    employeeNumber: task.assigneeEmployee.employeeNumber,
    department: task.assigneeEmployee.department ?? null,
    position: null,
    primaryLocation: task.assigneeEmployee.primaryLocation ?? null,
  };
}

function buildManagerEmployeeFromLiveSession(
  session: AttendanceLiveSession,
): ManagerEmployee | null {
  if (!session.employeeId || !session.employeeName.trim()) {
    return null;
  }

  const nameParts = session.employeeName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? session.employeeName.trim();
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: session.employeeId,
    firstName,
    lastName,
    email: "",
    employeeNumber: session.employeeNumber,
    department: session.department
      ? {
          id: `session-department:${session.employeeId}`,
          name: session.department,
        }
      : null,
    position: null,
    primaryLocation: session.location
      ? {
          id: `session-location:${session.employeeId}`,
          name: session.location,
        }
      : null,
  };
}

function attendanceSortRank(session: AttendanceLiveSession | null) {
  if (!session) {
    return 0;
  }

  if (session.lateMinutes > 0) {
    return 1;
  }

  return 2;
}

function isoAt(daysOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildDemoEmployees(): ManagerEmployee[] {
  const source = [
    ["Elena", "Morozova", "Operations", "Store Lead", "Downtown", "female"],
    ["Roman", "Volkov", "Sales", "Floor Manager", "Downtown", "male"],
    ["Alina", "Kuznetsova", "Support", "Customer Care", "Mall West", "female"],
    [
      "Maxim",
      "Lebedev",
      "Warehouse",
      "Shift Coordinator",
      "Warehouse A",
      "male",
    ],
    ["Sofia", "Orlova", "Retail", "Senior Associate", "Mall West", "female"],
    ["Ilya", "Petrov", "Logistics", "Dispatcher", "Warehouse A", "male"],
    [
      "Maria",
      "Sokolova",
      "Retail",
      "Visual Merchandiser",
      "Central Plaza",
      "female",
    ],
    ["Denis", "Fedorov", "Support", "Team Lead", "Central Plaza", "male"],
  ] as const;

  let fIdx = 0;
  let mIdx = 0;

  return source.map(
    (
      [firstName, lastName, departmentName, positionName, locationName, gender],
      index,
    ) => {
      const avatar =
        gender === "female"
          ? MOCK_AVATARS.female[fIdx++ % MOCK_AVATARS.female.length]
          : MOCK_AVATARS.male[mIdx++ % MOCK_AVATARS.male.length];

      return {
        id: `demo-employee-${index + 1}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hiteam.demo`,
        employeeNumber: `EMP-${String(410 + index).padStart(4, "0")}`,
        department: {
          id: `demo-department-${index + 1}`,
          name: departmentName,
        },
        position: {
          id: `demo-position-${index + 1}`,
          name: positionName,
        },
        primaryLocation: {
          id: `demo-location-${index + 1}`,
          name: locationName,
        },
        avatar,
      };
    },
  );
}

function buildDemoLiveSessions(
  employees: ManagerEmployee[],
): AttendanceLiveSession[] {
  const variants = [
    {
      hour: 9,
      minute: 14,
      lateMinutes: 14,
      earlyLeaveMinutes: 0,
      status: "on_shift" as const,
    },
    {
      hour: 8,
      minute: 53,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      status: "on_shift" as const,
    },
    {
      hour: 8,
      minute: 56,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      status: "on_break" as const,
    },
    {
      hour: 8,
      minute: 58,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      status: "checked_out" as const,
    },
  ] as const;

  return employees.slice(0, 4).map((employee, index) => {
    const variant = variants[index % variants.length];
    const startedAt = isoAt(0, variant.hour, variant.minute);
    const endedAt =
      variant.status === "checked_out"
        ? isoAt(
            0,
            variant.hour + 8,
            variant.minute + (index % 2 === 0 ? -10 : 5),
          )
        : null;

    return {
      sessionId: `demo-session-${employee.id}`,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? "Team",
      location: employee.primaryLocation?.name ?? "Main location",
      shiftLabel: "09:00 - 18:00",
      status: variant.status,
      startedAt,
      endedAt,
      totalMinutes:
        variant.status === "checked_out" ? 470 - variant.earlyLeaveMinutes : 0,
      breakMinutes: variant.status === "on_break" ? 20 : 30,
      paidBreakMinutes: 15,
      lateMinutes: variant.lateMinutes,
      earlyLeaveMinutes: variant.earlyLeaveMinutes,
    };
  });
}

function buildDemoTasks(employees: ManagerEmployee[]): TaskItem[] {
  const managerEmployee = {
    id: "demo-manager",
    firstName: "Alex",
    lastName: "Johnson",
  };

  return employees.flatMap((employee, index) => {
    const baseTask: TaskItem = {
      id: `demo-task-${employee.id}-1`,
      title: `Morning floor check ${index + 1}`,
      description:
        "Check the work zone, confirm supplies, and post a short status update for the shift.",
      status:
        index % 3 === 0 ? "DONE" : index % 2 === 0 ? "IN_PROGRESS" : "TODO",
      priority: index % 4 === 0 ? "HIGH" : "MEDIUM",
      requiresPhoto: index % 2 === 0,
      isRecurring: false,
      taskTemplateId: null,
      occurrenceDate: null,
      dueAt: isoAt(0, 11 + (index % 4), 0),
      completedAt: index % 3 === 0 ? isoAt(0, 10, 20) : null,
      createdAt: isoAt(-1, 18, 0),
      updatedAt: isoAt(0, 10 + (index % 3), 0),
      groupId: null,
      assigneeEmployeeId: employee.id,
      managerEmployee,
      assigneeEmployee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        primaryLocation: employee.primaryLocation,
      },
      group: null,
      checklistItems: [],
      activities: [],
      photoProofs: [],
    };

    const meetingTask: TaskItem = {
      ...baseTask,
      id: `demo-task-${employee.id}-2`,
      title: `Service follow-up with ${employee.firstName}`,
      description:
        appendTaskMeta(
          "Review today priorities, blockers, and update the manager once it is done.",
          {
            kind: "meeting",
            meetingMode: index % 2 === 0 ? "offline" : "online",
            meetingLocation: index % 2 === 0 ? "Meeting Room A" : undefined,
            meetingLink:
              index % 2 === 1
                ? "https://meet.hiteam.demo/manager-sync"
                : undefined,
          },
        ) ?? null,
      status: index % 2 === 0 ? "TODO" : "DONE",
      priority: "MEDIUM",
      dueAt: isoAt(0, 15 + (index % 2), 30),
      completedAt: index % 2 === 1 ? isoAt(0, 14, 45) : null,
      createdAt: isoAt(-2, 15, 0),
      updatedAt: isoAt(0, 12 + (index % 2), 15),
    };

    return [baseTask, meetingTask];
  });
}

function buildDemoHistory(
  employee: ManagerEmployee,
): AttendanceHistoryResponse {
  const rows = Array.from({ length: 14 }, (_, index) => {
    const daysAgo = 13 - index;
    const workedMinutes = 480 - ((index + 1) % 4) * 5;
    const lateMinutes = index % 5 === 0 ? 10 : index % 4 === 0 ? 4 : 0;
    const earlyLeaveMinutes = index % 6 === 0 ? 12 : 0;
    const startedAt = isoAt(-daysAgo, 9, lateMinutes);
    const endedAt = isoAt(-daysAgo, 18, -earlyLeaveMinutes);

    return {
      sessionId: `demo-history-${employee.id}-${index + 1}`,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name ?? "Team",
      location: employee.primaryLocation?.name ?? "Main location",
      shiftLabel: "09:00 - 18:00",
      status: "checked_out" as const,
      startedAt,
      endedAt,
      totalMinutes: workedMinutes + 30,
      workedMinutes,
      breakMinutes: 30,
      paidBreakMinutes: 15,
      lateMinutes,
      earlyLeaveMinutes,
      checkInEvent: {
        occurredAt: startedAt,
        distanceMeters: 8,
        notes: null,
      },
      checkOutEvent: {
        occurredAt: endedAt,
        distanceMeters: 10,
        notes: null,
      },
      breaks: [],
    };
  });

  return {
    range: {
      dateFrom: rows[0]?.startedAt ?? isoAt(-13, 9, 0),
      dateTo: rows[rows.length - 1]?.endedAt ?? isoAt(0, 18, 0),
    },
    totals: {
      sessions: rows.length,
      workedMinutes: rows.reduce((sum, row) => sum + row.workedMinutes, 0),
      breakMinutes: rows.reduce((sum, row) => sum + row.breakMinutes, 0),
      paidBreakMinutes: rows.reduce(
        (sum, row) => sum + row.paidBreakMinutes,
        0,
      ),
      lateMinutes: rows.reduce((sum, row) => sum + row.lateMinutes, 0),
      earlyLeaveMinutes: rows.reduce(
        (sum, row) => sum + row.earlyLeaveMinutes,
        0,
      ),
    },
    rows,
  };
}

function buildDemoManagerData() {
  const demoEmployees = buildDemoEmployees();
  return {
    employees: demoEmployees,
    liveSessions: buildDemoLiveSessions(demoEmployees),
    tasks: buildDemoTasks(demoEmployees),
  };
}

export default function ManagerScreen({
  active = true,
  standalone = false,
}: ManagerScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const newsActionTitle = language === "ru" ? "Новости" : "News";
  const newsActionHint =
    language === "ru"
      ? "Откройте список новостей компании и общий статус прочтения."
      : "Open company news and overall readership status.";
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<{
        profile?: Awaited<ReturnType<typeof loadMyProfile>> | null;
        employees: ManagerEmployee[];
        liveSessions: AttendanceLiveSession[];
        tasks: TaskItem[];
      }>(MANAGER_SCREEN_CACHE_KEY, MANAGER_SCREEN_CACHE_TTL_MS),
    [],
  );
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof loadMyProfile>
  > | null>(initialSnapshot?.value.profile ?? null);
  const [employees, setEmployees] = useState<ManagerEmployee[]>(initialSnapshot?.value.employees ?? []);
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(initialSnapshot?.value.liveSessions ?? []);
  const [tasks, setTasks] = useState<TaskItem[]>(initialSnapshot?.value.tasks ?? []);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(
    null,
  );
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [activePhotoTaskId, setActivePhotoTaskId] = useState<string | null>(
    null,
  );
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [failedAvatarEmployeeIds, setFailedAvatarEmployeeIds] = useState<
    Set<string>
  >(new Set());
  const businessTimeZone = profile?.primaryLocation?.timezone ?? null;
  const { getTaskTitle } = useTranslatedTaskCopy(tasks, language);

  useEffect(() => {
    return subscribeScreenCache<{
      profile?: Awaited<ReturnType<typeof loadMyProfile>> | null;
      employees: ManagerEmployee[];
      liveSessions: AttendanceLiveSession[];
      tasks: TaskItem[];
    }>(MANAGER_SCREEN_CACHE_KEY, (entry) => {
      if (!entry) {
        return;
      }

      setProfile(entry.value.profile ?? null);
      setEmployees(entry.value.employees);
      setLiveSessions(entry.value.liveSessions);
      setTasks(entry.value.tasks);
      setFailedAvatarEmployeeIds(new Set());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      const cached = await readScreenCache<{
        profile?: Awaited<ReturnType<typeof loadMyProfile>> | null;
        employees: ManagerEmployee[];
        liveSessions: AttendanceLiveSession[];
        tasks: TaskItem[];
      }>(MANAGER_SCREEN_CACHE_KEY, MANAGER_SCREEN_CACHE_TTL_MS);

      if (cached) {
        setProfile(cached.value.profile ?? null);
        setEmployees(cached.value.employees);
        setLiveSessions(cached.value.liveSessions);
        setTasks(cached.value.tasks);
        setLoading(false);
        const hasUsefulCachedData =
          cached.value.employees.length > 0 ||
          cached.value.liveSessions.length > 0 ||
          cached.value.tasks.length > 0;

        if (!cached.isStale && hasUsefulCachedData) {
          return;
        }
      }

      const now = new Date();
      const cachedTimeZone = cached?.value.profile?.primaryLocation?.timezone ?? null;
      const initialPreviousDateKey = formatDateKeyInTimeZone(
        addDays(now, -1),
        cachedTimeZone,
      );
      const initialNextDayDateKey = formatDateKeyInTimeZone(
        addDays(now, 1),
        cachedTimeZone,
      );

      const [profileResult, employeesResult, liveSessionsResult] =
        await Promise.allSettled([
          loadMyProfile(),
          loadManagerEmployees(),
          loadManagerLiveSessions(),
        ]);

      const nextProfile =
        profileResult.status === "fulfilled"
          ? profileResult.value
          : cached?.value.profile ?? null;
      const nextEmployees =
        employeesResult.status === "fulfilled"
          ? Array.isArray(employeesResult.value)
            ? employeesResult.value
            : []
          : cached?.value.employees ?? [];
      const nextLiveSessions =
        liveSessionsResult.status === "fulfilled"
          ? Array.isArray(liveSessionsResult.value)
            ? liveSessionsResult.value
            : []
          : cached?.value.liveSessions ?? [];

      const resolvedTimeZone = nextProfile?.primaryLocation?.timezone ?? cachedTimeZone;
      const resolvedPreviousDateKey = formatDateKeyInTimeZone(
        addDays(now, -1),
        resolvedTimeZone,
      );
      const resolvedNextDayDateKey = formatDateKeyInTimeZone(
        addDays(now, 1),
        resolvedTimeZone,
      );

      let nextTasks = cached?.value.tasks ?? [];

      try {
        nextTasks = await loadManagerTasks({
          dateFrom: resolvedPreviousDateKey,
          dateTo: resolvedNextDayDateKey,
        });
      } catch {
        try {
          nextTasks = await loadManagerTasks({
            dateFrom: initialPreviousDateKey,
            dateTo: initialNextDayDateKey,
          });
        } catch {
          try {
            nextTasks = await loadManagerTasks();
          } catch {
            nextTasks = cached?.value.tasks ?? [];
          }
        }
      }

      await primeTaskTranslations(nextTasks, language);

      setProfile(nextProfile);
      setEmployees(nextEmployees);
      setLiveSessions(nextLiveSessions);
      setTasks(nextTasks);
      setFailedAvatarEmployeeIds(new Set());
      setLoading(false);

      void writeScreenCache(MANAGER_SCREEN_CACHE_KEY, {
        profile: nextProfile,
        employees: nextEmployees,
        liveSessions: nextLiveSessions,
        tasks: nextTasks,
      });
    }

    void loadData();
  }, []);

  const liveSessionByEmployeeId = useMemo(
    () =>
      new Map(
        (liveSessions ?? []).map((session) => [session.employeeId, session]),
      ),
    [liveSessions],
  );

  const visibleTasks = useMemo(() => {
    return collapseDuplicateManagerTasks(tasks, businessTimeZone).filter(
      (task) => !isManagerTaskMeeting(task),
    );
  }, [businessTimeZone, tasks]);

  const employeeCards = useMemo(() => {
    const employeeMap = new Map<string, ManagerEmployee>();

    for (const employee of employees ?? []) {
      employeeMap.set(employee.id, employee);
    }

    for (const task of visibleTasks) {
      const taskEmployee = buildManagerEmployeeFromTask(task);
      if (taskEmployee && !employeeMap.has(taskEmployee.id)) {
        employeeMap.set(taskEmployee.id, taskEmployee);
      }
    }

    for (const session of liveSessions ?? []) {
      const sessionEmployee = buildManagerEmployeeFromLiveSession(session);
      if (sessionEmployee && !employeeMap.has(sessionEmployee.id)) {
        employeeMap.set(sessionEmployee.id, sessionEmployee);
      }
    }

    return Array.from(employeeMap.values())
      .map((employee) => {
        const liveSession = liveSessionByEmployeeId.get(employee.id) ?? null;
        const employeeTimeZone =
          employee.primaryLocation?.timezone ?? businessTimeZone;
        const employeeTodayDateKey = getEmployeeTaskDateKey(
          employee,
          businessTimeZone,
        );
        const assignedTasks = visibleTasks.filter(
          (task) =>
            (task.assigneeEmployeeId === employee.id ||
              task.assigneeEmployee?.id === employee.id) &&
            taskAnchorsManagerDateKey(
              task,
              employeeTodayDateKey,
              employeeTimeZone,
            ),
        );
        const openTasks = assignedTasks.filter((task) =>
          isTaskOpen(task.status),
        );
        const doneTasks = assignedTasks.filter(
          (task) => task.status === "DONE",
        );

        return {
          employee,
          liveSession,
          assignedTasks,
          openTasks,
          doneTasks,
        };
      })
      .sort((left, right) => {
        const leftRank = attendanceSortRank(left.liveSession);
        const rightRank = attendanceSortRank(right.liveSession);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        if (
          leftRank === 1 &&
          (right.liveSession?.lateMinutes ?? 0) !==
            (left.liveSession?.lateMinutes ?? 0)
        ) {
          return (
            (right.liveSession?.lateMinutes ?? 0) -
            (left.liveSession?.lateMinutes ?? 0)
          );
        }

        return buildEmployeeName(
          left.employee.firstName,
          left.employee.lastName,
        ).localeCompare(
          buildEmployeeName(right.employee.firstName, right.employee.lastName),
          locale,
        );
      });
  }, [businessTimeZone, employees, liveSessionByEmployeeId, liveSessions, locale, visibleTasks]);

  const activePhotoTask = useMemo(
    () => visibleTasks.find((task) => task.id === activePhotoTaskId) ?? null,
    [activePhotoTaskId, visibleTasks],
  );

  const activeTaskPhotos = useMemo(() => {
    if (!activePhotoTask) {
      return [];
    }

    return buildTaskPhotos(activePhotoTask, locale);
  }, [activePhotoTask, locale]);

  const selectedPhoto =
    activeTaskPhotos.find((photo) => photo.id === selectedPhotoId) ??
    activeTaskPhotos[0] ??
    null;

  useEffect(() => {
    if (!activeTaskPhotos.length) {
      setSelectedPhotoId(null);
      return;
    }

    setSelectedPhotoId((current) => {
      if (current && activeTaskPhotos.some((photo) => photo.id === current)) {
        return current;
      }

      return activeTaskPhotos[0]?.id ?? null;
    });
  }, [activeTaskPhotos]);

  const summary = useMemo(() => {
    const checkedInCount = employeeCards.filter(
      (item) => item.liveSession,
    ).length;
    const lateCount = employeeCards.filter(
      (item) => (item.liveSession?.lateMinutes ?? 0) > 0,
    ).length;

    return {
      checkedInCount,
      lateCount,
      totalEmployees: employeeCards.length,
    };
  }, [employeeCards]);

  function buildManagerCreateHref(
    path: "/manager/create-task" | "/manager/create-meeting" | "/manager/create-news",
  ) {
    return path as never;
  }

  function openCreateScreen(
    path: "/manager/create-task" | "/manager/create-meeting" | "/manager/create-news",
  ) {
    setActionMenuOpen(false);
    requestAnimationFrame(() => {
      router.push(buildManagerCreateHref(path));
    });
  }

  function toggleEmployeeExpanded(employeeId: string) {
    setExpandedEmployeeId((current) =>
      current === employeeId ? null : employeeId,
    );
  }

  function markAvatarFailed(employeeId: string) {
    setFailedAvatarEmployeeIds((current) => {
      if (current.has(employeeId)) {
        return current;
      }

      const next = new Set(current);
      next.add(employeeId);
      return next;
    });
  }

  function closePhotoViewer() {
    setActivePhotoTaskId(null);
    setSelectedPhotoId(null);
  }

  function openTaskPhotos(taskId: string) {
    setActivePhotoTaskId(taskId);
  }

  function attendanceTone(session: AttendanceLiveSession | null) {
    if (!session) {
      return {
        badgeVariant: "muted" as const,
        label: t("manager.noCheckInYet"),
        note: t("manager.noCheckInHint"),
      };
    }

    if (session.lateMinutes > 0) {
      return {
        badgeVariant: "alert" as const,
        label: t("manager.lateBy", { minutes: session.lateMinutes }),
        note: t("manager.checkedInAt", {
          time: new Date(session.startedAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }),
      };
    }

    if (session.earlyLeaveMinutes > 0) {
      return {
        badgeVariant: "muted" as const,
        label: t("manager.leftEarlyBy", { minutes: session.earlyLeaveMinutes }),
        note: t("manager.checkedOutAt", {
          time: session.endedAt
            ? new Date(session.endedAt).toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
        }),
      };
    }

    return {
      badgeVariant: "brand" as const,
      label: t("manager.onTime"),
      note: t("manager.checkedInAt", {
        time: new Date(session.startedAt).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }),
    };
  }

  function renderTaskLeading(task: TaskItem, photoCount: number) {
    const isDone = task.status === "DONE";

    if (task.requiresPhoto && photoCount > 0) {
      return (
        <Ionicons
          color="#6d73ff"
          name="images-outline"
          size={20}
        />
      );
    }

    if (task.requiresPhoto) {
      return (
        <Ionicons
          color="#22c55e"
          name="camera-outline"
          size={20}
        />
      );
    }

    if (isDone) {
      return (
        <Ionicons
          color="#22c55e"
          name="checkmark-circle"
          size={20}
        />
      );
    }

    return (
      <Ionicons
        color="#c4cfdf"
        name="ellipse-outline"
        size={20}
      />
    );
  }

  return (
    <>
      <View className="flex-1 bg-transparent">
        {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{
            paddingBottom: standalone ? 40 : 112,
            paddingHorizontal: 16,
            paddingTop: insets.top + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-5">
            <Animated.View
              entering={FadeInDown.duration(180).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 8 }],
              })}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="flex-row items-center gap-3">
                {standalone ? (
                  <PressableScale
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/70"
                    haptic="selection"
                    onPress={() => router.back()}
                  >
                    <Ionicons color="#1f2937" name="arrow-back" size={20} />
                  </PressableScale>
                ) : null}
                <View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons color="#1B3FF5" name="people" size={22} />
                    <Text className="font-display text-[28px] font-bold text-foreground">
                      {summary.checkedInCount}/{summary.totalEmployees}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[14px] font-semibold text-[#42526b]">
                    {t("manager.checkedIn")}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <PressableScale
                  className="min-h-11 flex-row items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4"
                  haptic="selection"
                  onPress={() => router.push("/?tab=news" as never)}
                >
                  <Ionicons color="#1f2937" name="newspaper-outline" size={16} />
                  <Text className="text-[13px] font-extrabold tracking-[1.2px] text-foreground">
                    {newsActionTitle}
                  </Text>
                </PressableScale>

                <Button
                  className="rounded-full border-white/80 bg-white/80 px-5"
                  label={`+ ${t("manager.createAction")}`}
                  onPress={() => setActionMenuOpen(true)}
                  textClassName="text-[13px] tracking-[1.2px]"
                  variant="secondary"
                />
              </View>
            </Animated.View>

            <View className="flex-row items-baseline gap-2">
              <Text className="text-[15px] font-semibold text-[#42526b]">
                {t("manager.lateShort")}
              </Text>
              <Text className="font-display text-[24px] font-bold text-[#be123c]">
                {summary.lateCount}
              </Text>
            </View>

            {loading ? (
              <View className="rounded-3xl border border-white/30 bg-white/70 px-4 py-5 shadow-sm shadow-[#1f2687]/10">
                <Text className="text-[15px] leading-6 text-[#6b7280]">
                  {t("common.loading")}
                </Text>
              </View>
            ) : employeeCards.length ? (
              <View className="overflow-hidden rounded-[30px] border border-white/30 bg-white/70 shadow-sm shadow-[#1f2687]/10">
                {employeeCards.map((item, index) => {
                  const tone = attendanceTone(item.liveSession);
                  const isExpanded = expandedEmployeeId === item.employee.id;
                  const showAvatar =
                    item.employee.avatar &&
                    !failedAvatarEmployeeIds.has(item.employee.id);
                  const checkInTime = item.liveSession
                    ? new Date(item.liveSession.startedAt).toLocaleTimeString(
                        locale,
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "—";
                  const isLast = index === employeeCards.length - 1;

                  return (
                    <Animated.View
                      entering={FadeInUp.delay(index * 24)
                        .duration(170)
                        .withInitialValues({
                          opacity: 0,
                          transform: [{ translateY: 8 }],
                        })}
                      key={item.employee.id}
                    >
                      <PressableScale
                        className="px-5 py-5"
                        haptic="selection"
                        onPress={() => toggleEmployeeExpanded(item.employee.id)}
                      >
                        <View className="flex-row items-center gap-4">
                          {showAvatar ? (
                            <Image
                              source={item.employee.avatar}
                              className="h-14 w-14 rounded-2xl"
                              onError={() => markAvatarFailed(item.employee.id)}
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff]">
                              <Text className="text-[16px] font-extrabold text-foreground">
                                {item.employee.firstName.charAt(0)}
                                {item.employee.lastName.charAt(0)}
                              </Text>
                            </View>
                          )}
                          <View className="flex-1">
                            <Text className="font-display text-[20px] font-bold text-foreground">
                              {item.employee.firstName} {item.employee.lastName}
                            </Text>
                            <Text className="mt-1 text-[14px] leading-5 text-[#7b8798]">
                              {item.employee.position?.name ??
                                item.employee.department?.name ??
                                item.employee.email}
                            </Text>
                          </View>

                          <View className="items-end gap-2">
                            <Ionicons
                              color="#6b7a90"
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={20}
                            />
                          </View>
                        </View>

                        {isExpanded ? (
                          <View className="mt-4 gap-3 border-t border-[#e4ebf5] pt-4">
                            {item.liveSession ? (
                              <Text className="text-[13px] font-semibold text-[#4f6df5]">
                                {t("manager.checkedInAt", { time: checkInTime })}
                              </Text>
                            ) : null}

                            <View className="flex-row items-center justify-between">
                              <Text className="text-[14px] font-semibold text-[#42526b]">
                                {t("manager.tasksToday")}
                              </Text>
                              <Badge
                                label={`${item.doneTasks.length}/${item.assignedTasks.length}`}
                                variant="muted"
                              />
                            </View>

                            {item.assignedTasks.length ? (
                              <View className="gap-1">
                                {[...item.assignedTasks]
                                  .sort((a, b) => {
                                    const aDone = a.status === "DONE" ? 1 : 0;
                                    const bDone = b.status === "DONE" ? 1 : 0;
                                    return aDone - bDone;
                                  })
                                  .slice(0, 5)
                                  .map((task) => {
                                    const isDone = task.status === "DONE";
                                    const photoCount = buildTaskPhotos(
                                      task,
                                      locale,
                                    ).length;
                                    const canOpenPhotos = photoCount > 0;
                                    const rowContent = (
                                      <View className="flex-row items-start gap-3 px-1 py-2">
                                        <View className="w-6 items-center pt-0.5">
                                          {renderTaskLeading(task, photoCount)}
                                        </View>
                                        <View className="flex-1">
                                          <Text
                                            className={`text-[16px] leading-6 ${isDone ? "line-through" : "text-foreground"}`}
                                            style={
                                              isDone
                                                ? { color: "#22c55e" }
                                                : undefined
                                            }
                                          >
                                            {getTaskTitle(task, {
                                              normalize: true,
                                            })}
                                          </Text>
                                          {task.requiresPhoto && photoCount > 0 ? (
                                            <Text className="mt-1 text-[13px] leading-5 text-[#7b8798]">
                                              {t("today.photosSaved", {
                                                count: photoCount,
                                              })}
                                            </Text>
                                          ) : null}
                                        </View>
                                      </View>
                                    );

                                    return canOpenPhotos ? (
                                      <PressableScale
                                        key={task.id}
                                        haptic="selection"
                                        onPress={() => openTaskPhotos(task.id)}
                                      >
                                        {rowContent}
                                      </PressableScale>
                                    ) : (
                                      <View key={task.id}>{rowContent}</View>
                                    );
                                  })}
                              </View>
                            ) : (
                              <View className="items-center justify-center px-4 py-6">
                                <Text className="text-center text-[13px] leading-5 text-[#6b7280]">
                                  {t("manager.noEmployeeTasks")}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : item.liveSession ? (
                          <Text className="mt-4 text-[13px] font-semibold text-[#42526b]">
                            {tone.note}
                          </Text>
                        ) : null}
                      </PressableScale>

                      {!isLast ? <View className="h-px bg-[#edf1f7]" /> : null}
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <View className="rounded-3xl border border-white/30 bg-white/70 px-4 py-5 shadow-sm shadow-[#1f2687]/10">
                <Text className="text-[15px] leading-6 text-[#6b7280]">
                  {t("manager.noEmployees")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        onClose={closePhotoViewer}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-6 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={activePhotoTask !== null}
      >
        {activePhotoTask ? (
          <View className="relative min-h-[610px]">
            <View className="pb-24">
              <View className="mb-4 flex-row items-start justify-between gap-4">
                <View className="w-10" />
                <View className="flex-1 items-center">
                  <Text className="text-center font-display text-[24px] font-bold text-foreground">
                    {t("manager.photoViewerTitle")}
                  </Text>
                  <Text className="mt-1 text-center font-body text-sm leading-6 text-muted-foreground">
                    {t("manager.photoViewerHint")}
                  </Text>
                </View>
                <View className="w-10" />
              </View>

              <View className="mb-4 h-9">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {activeTaskPhotos.map((photo, index) => {
                      const isSelected = selectedPhoto?.id === photo.id;

                      return (
                        <PressableScale
                          key={photo.id}
                          className={`h-9 w-9 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-[#d7def5] bg-white"
                          }`}
                          haptic="selection"
                          onPress={() => setSelectedPhotoId(photo.id)}
                        >
                          <Text
                            className={`font-display text-sm font-bold ${
                              isSelected ? "text-white" : "text-foreground"
                            }`}
                          >
                            {index + 1}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {selectedPhoto ? (
                <View className="mb-1 aspect-square overflow-hidden rounded-[26px] bg-[#dbe7ff]">
                  <Image
                    source={{ uri: selectedPhoto.uri }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View
                    className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-6"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.38)" }}
                  >
                    <Text className="font-display text-[28px] font-bold text-white">
                      {selectedPhoto.label}
                    </Text>
                    <Text className="mt-2 font-body text-sm text-white/90">
                      {t("today.photoCapturedAt", {
                        time: selectedPhoto.capturedAt,
                      })}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="items-center rounded-[26px] border border-dashed border-primary/20 bg-white px-5 py-10">
                  <Ionicons
                    color="#6d73ff"
                    name="images-outline"
                    size={24}
                  />
                  <Text className="mt-4 text-center font-body text-sm leading-6 text-muted-foreground">
                    {t("manager.noTaskPhotos")}
                  </Text>
                </View>
              )}
            </View>

            <View className="absolute inset-x-0 bottom-2">
              <PressableScale
                className="rounded-[24px] bg-primary px-4 py-4"
                haptic="selection"
                onPress={closePhotoViewer}
              >
                <Text className="text-center font-display text-[16px] font-semibold text-white">
                  {t("common.done")}
                </Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setActionMenuOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={actionMenuOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">
              {t("manager.quickCreateTitle")}
            </Text>
            <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
              {t("manager.quickCreateHint")}
            </Text>
          </View>
          <PressableScale
            className="h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff]/80"
            haptic="selection"
            onPress={() => setActionMenuOpen(false)}
          >
            <Ionicons color="#111827" name="close" size={18} />
          </PressableScale>
        </View>

        <View className="gap-3">
          <PressableScale
            className="rounded-[26px] border border-black/15 bg-[#edf4ff] px-5 py-5"
            haptic="selection"
            onPress={() => openCreateScreen("/manager/create-task")}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Ionicons color="#4f6df5" name="checkbox-outline" size={22} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[17px] font-semibold text-foreground">
                  {t("manager.addTask")}
                </Text>
                <Text className="mt-1 font-body text-sm text-muted-foreground">
                  {t("manager.addTaskHint")}
                </Text>
              </View>
            </View>
          </PressableScale>

          <PressableScale
            className="rounded-[26px] border border-black/15 bg-[#f4f7ff] px-5 py-5"
            haptic="selection"
            onPress={() => openCreateScreen("/manager/create-meeting")}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Ionicons color="#4f6df5" name="people-outline" size={22} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[17px] font-semibold text-foreground">
                  {t("manager.addMeeting")}
                </Text>
                <Text className="mt-1 font-body text-sm text-muted-foreground">
                  {t("manager.addMeetingHint")}
                </Text>
              </View>
            </View>
          </PressableScale>

          <PressableScale
            className="rounded-[26px] border border-black/15 bg-[#f5f8ff] px-5 py-5"
            haptic="selection"
            onPress={() => openCreateScreen("/manager/create-news")}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Ionicons color="#4f6df5" name="create-outline" size={22} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[17px] font-semibold text-foreground">
                  {t("manager.addNews")}
                </Text>
                <Text className="mt-1 font-body text-sm text-muted-foreground">
                  {t("manager.addNewsHint")}
                </Text>
              </View>
            </View>
          </PressableScale>
        </View>
      </BottomSheetModal>
    </>
  );
}
