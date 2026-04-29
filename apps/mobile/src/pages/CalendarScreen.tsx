import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { Image, Platform, ScrollView, View } from "react-native";
import { Text } from "../../components/ui/text";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AnnouncementItem, TaskItem, WorkGroupItem } from "@smart/types";
import BottomSheetModal from "../components/BottomSheetModal";
import { TimeWheelPicker, type TimeValue } from "../components/TimeWheelPicker";
import { hasManagerAccess, useAuthFlowState } from "../../lib/auth-flow";
import {
  createManagerShift,
  loadManagerScheduleBootstrap,
  loadMyAnnouncements,
  rescheduleMyTask,
  updateMyTaskStatus,
  type ManagerEmployeeItem,
  type ManagerScheduleShiftItem,
  type ManagerShiftTemplateItem,
} from "../../lib/api";
import {
  getDateLocale,
  getDirectionalIconStyle,
  useI18n,
} from "../../lib/i18n";
import { hapticSelection } from "../../lib/haptics";
import {
  peekScreenCache,
  readScreenCache,
  subscribeScreenCache,
  writeScreenCache,
} from "../../lib/screen-cache";
import { parseTaskMeta } from "../../lib/task-meta";
import {
  isTaskMeeting,
  isTaskOpen,
  parseTaskDueAt,
} from "../../lib/task-utils";
import {
  primeTaskTranslations,
  useTranslatedTaskCopy,
} from "../../lib/use-translated-task-copy";
import { PressableScale } from "../../components/ui/pressable-scale";
import { Button } from "../../components/ui/button";
import {
  getNewsScreenCacheKey,
  NEWS_SCREEN_CACHE_TTL_MS,
  warmAnnouncementImages,
} from "../../lib/workspace-cache";

type CalendarDayItem = {
  id: string;
  task: TaskItem;
  title: string;
  kind: "task" | "meeting";
  note: string;
  status: "done" | "planned" | "cancelled" | "overdue";
};

type CalendarScreenProps = {
  active?: boolean;
  overdueSheetSignal?: number;
};

type CalendarShift = NonNullable<
  Awaited<ReturnType<typeof loadManagerScheduleBootstrap>>["initialData"]
>["shifts"][number];
type ManagerEmployee = ManagerEmployeeItem;
type ManagerGroup = WorkGroupItem;
type ManagerScheduleShift = ManagerScheduleShiftItem;
type ManagerShiftTemplate = ManagerShiftTemplateItem;

type CalendarScreenCacheValue = {
  shifts: CalendarShift[];
  tasks: TaskItem[];
  managerEmployees?: ManagerEmployee[];
  managerGroups?: ManagerGroup[];
  managerShifts?: ManagerScheduleShift[];
  shiftTemplates?: ManagerShiftTemplate[];
};

const CALENDAR_SCREEN_CACHE_TTL_MS = 5 * 60_000;

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function combineDateAndTime(date: Date, time: TimeValue) {
  const next = new Date(date);
  next.setHours(time.hour, time.minute, 0, 0);
  return next;
}

function isOverdueTask(task: TaskItem, referenceDate: Date) {
  if (!isTaskOpen(task.status)) {
    return false;
  }

  const dueAt = parseTaskDueAt(task);
  return Boolean(
    dueAt && startOfDay(dueAt).getTime() < startOfDay(referenceDate).getTime(),
  );
}

function getTaskCalendarDate(task: TaskItem) {
  const meta = parseTaskMeta(task.description);
  const dateSource =
    meta.meeting?.scheduledAt ?? task.dueAt ?? task.occurrenceDate ?? task.createdAt;

  if (!dateSource) {
    return null;
  }

  const parsed = new Date(dateSource);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTaskAssigneeId(task: TaskItem) {
  return task.assigneeEmployeeId ?? task.assigneeEmployee?.id ?? null;
}

function buildEmployeeName(firstName?: string | null, lastName?: string | null) {
  return [lastName?.trim(), firstName?.trim()].filter(Boolean).join(" ").trim();
}

function getEmployeeInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "HI";
}

function getEmployeeSubtitle(employee: ManagerEmployee) {
  return (
    employee.position?.name ??
    employee.department?.name ??
    employee.primaryLocation?.name ??
    employee.email
  );
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

function formatShiftRange(shift: ManagerScheduleShift, locale: string) {
  const start = new Date(shift.startsAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Date(shift.endsAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${start} - ${end}`;
}

function formatAnnouncementDate(value: string, locale: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarScreen({
  active = true,
  overdueSheetSignal = 0,
}: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, t, tp } = useI18n();
  const { roleCodes } = useAuthFlowState();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const locale = getDateLocale(language);
  const isManager = hasManagerAccess(roleCodes);
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthAnimationDirection, setMonthAnimationDirection] = useState<
    "next" | "prev"
  >("next");
  const [overdueSheetVisible, setOverdueSheetVisible] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTaskAction, setPendingTaskAction] = useState<
    "done" | "delete" | "reschedule" | null
  >(null);
  const [rescheduleTaskItem, setRescheduleTaskItem] = useState<TaskItem | null>(
    null,
  );
  const [rescheduleSheetVisible, setRescheduleSheetVisible] = useState(false);
  const [rescheduleDatePickerVisible, setRescheduleDatePickerVisible] =
    useState(false);
  const [rescheduleDateValue, setRescheduleDateValue] = useState(() =>
    startOfDay(today),
  );
  const [rescheduleTimeValue, setRescheduleTimeValue] = useState<TimeValue>(
    () => ({
      hour: today.getHours(),
      minute: today.getMinutes(),
    }),
  );
  const [rescheduleTimePickerVisible, setRescheduleTimePickerVisible] =
    useState(false);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthKey = `${year}-${monthIndex}`;
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const month = currentDate.toLocaleString(locale, {
    month: "long",
    year: "numeric",
  });
  const calendarCacheKey = `calendar-screen:${isManager ? "manager" : "employee"}:${year}-${monthIndex}`;
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<CalendarScreenCacheValue>(
        calendarCacheKey,
        CALENDAR_SCREEN_CACHE_TTL_MS,
      ),
    [calendarCacheKey],
  );
  const newsCacheKey = useMemo(() => getNewsScreenCacheKey(false), []);
  const initialNewsSnapshot = useMemo(
    () =>
      !isManager
        ? peekScreenCache<AnnouncementItem[]>(
            newsCacheKey,
            NEWS_SCREEN_CACHE_TTL_MS,
          )
        : null,
    [isManager, newsCacheKey],
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<CalendarShift[]>(
    initialSnapshot?.value.shifts ?? [],
  );
  const [tasks, setTasks] = useState<TaskItem[]>(
    initialSnapshot?.value.tasks ?? [],
  );
  const [managerEmployees, setManagerEmployees] = useState<ManagerEmployee[]>(
    initialSnapshot?.value.managerEmployees ?? [],
  );
  const [managerGroups, setManagerGroups] = useState<ManagerGroup[]>(
    initialSnapshot?.value.managerGroups ?? [],
  );
  const [managerShifts, setManagerShifts] = useState<ManagerScheduleShift[]>(
    initialSnapshot?.value.managerShifts ?? [],
  );
  const [shiftTemplates, setShiftTemplates] = useState<ManagerShiftTemplate[]>(
    initialSnapshot?.value.shiftTemplates ?? [],
  );
  const [managerFilterSheetVisible, setManagerFilterSheetVisible] =
    useState(false);
  const [selectedManagerEmployeeIds, setSelectedManagerEmployeeIds] = useState<
    string[]
  >([]);
  const [selectedManagerGroupIds, setSelectedManagerGroupIds] = useState<
    string[]
  >([]);
  const [expandedManagerEmployeeId, setExpandedManagerEmployeeId] = useState<
    string | null
  >(null);
  const [expandedManagerGroupIds, setExpandedManagerGroupIds] = useState<
    string[]
  >([]);
  const [failedAvatarEmployeeIds, setFailedAvatarEmployeeIds] = useState<
    Set<string>
  >(() => new Set());
  const [assignShiftSheetVisible, setAssignShiftSheetVisible] = useState(false);
  const [assignShiftEmployeeId, setAssignShiftEmployeeId] = useState("");
  const [assignShiftTemplateId, setAssignShiftTemplateId] = useState("");
  const [assignShiftSubmitting, setAssignShiftSubmitting] = useState(false);
  const [assignShiftError, setAssignShiftError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(
    initialNewsSnapshot?.value ?? [],
  );
  const { getTaskBody, getTaskMeetingLocation, getTaskTitle } =
    useTranslatedTaskCopy(tasks, language);
  const isCurrentMonth =
    year === today.getFullYear() && monthIndex === today.getMonth();
  const selectedDate = new Date(year, monthIndex, selectedDay);
  const selectedDayKey = formatDateKey(selectedDate);
  const todayStart = useMemo(() => startOfDay(today), [today]);

  useEffect(() => {
    return subscribeScreenCache<CalendarScreenCacheValue>(calendarCacheKey, (entry) => {
      if (!entry) {
        return;
      }

      void primeTaskTranslations(entry.value.tasks, language).catch(
        () => undefined,
      );
      setShifts(entry.value.shifts);
      setTasks(entry.value.tasks);
      setManagerEmployees(entry.value.managerEmployees ?? []);
      setManagerGroups(entry.value.managerGroups ?? []);
      setManagerShifts(entry.value.managerShifts ?? []);
      setShiftTemplates(entry.value.shiftTemplates ?? []);
      setLoading(false);
    });
  }, [calendarCacheKey, language]);

  useEffect(() => {
    if (isManager) {
      setAnnouncements([]);
      return;
    }

    const unsubscribe = subscribeScreenCache<AnnouncementItem[]>(
      newsCacheKey,
      (entry) => {
        if (!entry) {
          return;
        }

        setAnnouncements(entry.value);
      },
    );

    void readScreenCache<AnnouncementItem[]>(
      newsCacheKey,
      NEWS_SCREEN_CACHE_TTL_MS,
    ).then((entry) => {
      if (entry) {
        setAnnouncements(entry.value);
        if (!entry.isStale) {
          return;
        }
      }

      void loadMyAnnouncements()
        .then(async (items) => {
          setAnnouncements(items);
          await writeScreenCache(newsCacheKey, items);
          await warmAnnouncementImages(items);
        })
        .catch(() => undefined);
    });

    return unsubscribe;
  }, [isManager, newsCacheKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const cached = await readScreenCache<CalendarScreenCacheValue>(
        calendarCacheKey,
        CALENDAR_SCREEN_CACHE_TTL_MS,
      );

      if (cached && !cancelled) {
        void primeTaskTranslations(cached.value.tasks, language).catch(
          () => undefined,
        );
        setShifts(cached.value.shifts);
        setTasks(cached.value.tasks);
        setManagerEmployees(cached.value.managerEmployees ?? []);
        setManagerGroups(cached.value.managerGroups ?? []);
        setManagerShifts(cached.value.managerShifts ?? []);
        setShiftTemplates(cached.value.shiftTemplates ?? []);
        setLoading(false);
        if (!cached.isStale) {
          return;
        }
      } else if (!initialSnapshot) {
        setLoading(true);
      }

      setError(null);

      try {
        const rangeStart = new Date(year, monthIndex - 1, 1);
        const rangeEnd = new Date(year, monthIndex + 1, 0);
        const rangeQuery = {
          dateFrom: formatDateKey(rangeStart),
          dateTo: formatDateKey(rangeEnd),
        };
        let nextShifts: CalendarShift[] = [];
        let nextTasks: TaskItem[] = [];
        let nextManagerEmployees: ManagerEmployee[] = [];
        let nextManagerGroups: ManagerGroup[] = [];
        let nextManagerShifts: ManagerScheduleShift[] = [];
        let nextShiftTemplates: ManagerShiftTemplate[] = [];
        let partialLoadError: string | null = null;

        const scheduleSnapshot = await loadManagerScheduleBootstrap(rangeQuery);
        const scheduleData = scheduleSnapshot.initialData;

        if (!scheduleData) {
          throw new Error(t("today.loadError"));
        }

        nextTasks = scheduleData.taskBoard?.tasks ?? cached?.value.tasks ?? [];

        if (isManager) {
          nextManagerEmployees = scheduleData.employees;
          nextManagerGroups = scheduleData.groups ?? [];
          nextManagerShifts = scheduleData.shifts;
          nextShiftTemplates = scheduleData.templates;
        } else {
          nextShifts = scheduleData.shifts;
        }

        if (!cancelled) {
          await primeTaskTranslations(nextTasks, language);
          setShifts(nextShifts);
          setTasks(nextTasks);
          setManagerEmployees(nextManagerEmployees);
          setManagerGroups(nextManagerGroups);
          setManagerShifts(nextManagerShifts);
          setShiftTemplates(nextShiftTemplates);
          void writeScreenCache(calendarCacheKey, {
            shifts: nextShifts,
            tasks: nextTasks,
            managerEmployees: nextManagerEmployees,
            managerGroups: nextManagerGroups,
            managerShifts: nextManagerShifts,
            shiftTemplates: nextShiftTemplates,
          });
          setError(partialLoadError);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : t("today.loadError"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [calendarCacheKey, initialSnapshot, isManager, language, monthIndex, t, year]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  useEffect(() => {
    if (overdueSheetSignal > 0) {
      setOverdueSheetVisible(true);
    }
  }, [overdueSheetSignal]);

  const cells: Array<number | null> = [];
  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const weekday = new Date(2026, 0, 5 + index);
    return weekday.toLocaleString(locale, { weekday: "short" });
  });

  const shiftByDateKey = useMemo(() => {
    const map = new Map<string, CalendarShift>();

    shifts.forEach((shift) => {
      const shiftDate = new Date(shift.shiftDate);
      map.set(formatDateKey(shiftDate), shift);
    });

    return map;
  }, [shifts]);

  const itemsByDateKey = useMemo(() => {
    const map = new Map<string, CalendarDayItem[]>();

    tasks.forEach((task) => {
      const meta = parseTaskMeta(task.description);
      const dateSource = meta.meeting?.scheduledAt ?? task.dueAt ?? null;
      if (!dateSource) {
        return;
      }

      const dueAt = new Date(dateSource);
      if (Number.isNaN(dueAt.getTime())) {
        return;
      }

      const key = formatDateKey(dueAt);
      const nextItems = map.get(key) ?? [];
      const overdue = isOverdueTask(task, today);
      nextItems.push({
        id: task.id,
        task,
        title: getTaskTitle(task, {
          normalize: true,
          hideSourceBeforeReady: true,
        }),
        kind: isTaskMeeting(task) ? "meeting" : "task",
        note:
          getTaskMeetingLocation(task, { hideSourceBeforeReady: true }) ||
          meta.meeting?.meetingLink ||
          getTaskBody(task, { hideSourceBeforeReady: true }) ||
          dueAt.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }),
        status:
          task.status === "DONE"
            ? "done"
            : task.status === "CANCELLED"
              ? "cancelled"
              : overdue
                ? "overdue"
                : "planned",
      });
      map.set(key, nextItems);
    });

    return map;
  }, [getTaskBody, getTaskMeetingLocation, getTaskTitle, locale, tasks, today]);

  const eventDays = useMemo(() => {
    const days = new Set<number>();

    Array.from(shiftByDateKey.keys()).forEach((key) => {
      const [itemYear, itemMonth, itemDay] = key.split("-").map(Number);
      if (itemYear === year && itemMonth === monthIndex + 1) {
        days.add(itemDay);
      }
    });

    Array.from(itemsByDateKey.keys()).forEach((key) => {
      const [itemYear, itemMonth, itemDay] = key.split("-").map(Number);
      if (itemYear === year && itemMonth === monthIndex + 1) {
        days.add(itemDay);
      }
    });

    managerShifts.forEach((shift) => {
      const shiftDate = new Date(shift.shiftDate);
      if (
        !Number.isNaN(shiftDate.getTime()) &&
        shiftDate.getFullYear() === year &&
        shiftDate.getMonth() === monthIndex
      ) {
        days.add(shiftDate.getDate());
      }
    });

    return days;
  }, [itemsByDateKey, managerShifts, monthIndex, shiftByDateKey, year]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((task) => isOverdueTask(task, today))
      .sort((left, right) => {
        const leftDueAt = parseTaskDueAt(left)?.getTime() ?? Infinity;
        const rightDueAt = parseTaskDueAt(right)?.getTime() ?? Infinity;
        return leftDueAt - rightDueAt;
      });
  }, [tasks, today]);
  const latestAnnouncements = useMemo(() => {
    return [...announcements]
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) {
          return left.isPinned ? -1 : 1;
        }

        const leftTimestamp = new Date(
          left.publishedAt ?? left.createdAt,
        ).getTime();
        const rightTimestamp = new Date(
          right.publishedAt ?? right.createdAt,
        ).getTime();
        return rightTimestamp - leftTimestamp;
      })
      .slice(0, 3);
  }, [announcements]);

  const managerEmployeeDirectory = useMemo(() => {
    const map = new Map<string, ManagerEmployee>();

    managerEmployees.forEach((employee) => {
      map.set(employee.id, employee);
    });

    tasks.forEach((task) => {
      const employee = buildManagerEmployeeFromTask(task);
      if (employee && !map.has(employee.id)) {
        map.set(employee.id, employee);
      }
    });

    managerGroups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (map.has(membership.employee.id)) {
          return;
        }

        map.set(membership.employee.id, {
          id: membership.employee.id,
          firstName: membership.employee.firstName,
          lastName: membership.employee.lastName,
          employeeNumber: membership.employee.employeeNumber,
          email: "",
          department: null,
          position: null,
          primaryLocation: null,
        });
      });
    });

    managerShifts.forEach((shift) => {
      if (map.has(shift.employee.id)) {
        return;
      }

      map.set(shift.employee.id, {
        id: shift.employee.id,
        firstName: shift.employee.firstName,
        lastName: shift.employee.lastName,
        employeeNumber: shift.employee.employeeNumber,
        email: "",
        department: null,
        position: shift.position ?? null,
        primaryLocation: shift.location ?? null,
      });
    });

    return map;
  }, [managerEmployees, managerGroups, managerShifts, tasks]);

  const sortedManagerEmployees = useMemo(() => {
    return Array.from(managerEmployeeDirectory.values()).sort((left, right) =>
      buildEmployeeName(left.firstName, left.lastName).localeCompare(
        buildEmployeeName(right.firstName, right.lastName),
        locale,
      ),
    );
  }, [locale, managerEmployeeDirectory]);

  const selectedGroupEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    managerGroups.forEach((group) => {
      if (!selectedManagerGroupIds.includes(group.id)) {
        return;
      }

      group.memberships.forEach((membership) => {
        ids.add(membership.employeeId);
      });
    });

    return ids;
  }, [managerGroups, selectedManagerGroupIds]);

  const activeManagerEmployeeIdSet = useMemo(() => {
    if (
      selectedManagerEmployeeIds.length === 0 &&
      selectedManagerGroupIds.length === 0
    ) {
      return new Set(sortedManagerEmployees.map((employee) => employee.id));
    }

    const ids = new Set<string>(selectedManagerEmployeeIds);
    selectedGroupEmployeeIds.forEach((id) => ids.add(id));
    return ids;
  }, [
    selectedGroupEmployeeIds,
    selectedManagerEmployeeIds,
    selectedManagerGroupIds.length,
    sortedManagerEmployees,
  ]);

  const visibleManagerEmployees = useMemo(
    () =>
      sortedManagerEmployees.filter((employee) =>
        activeManagerEmployeeIdSet.has(employee.id),
      ),
    [activeManagerEmployeeIdSet, sortedManagerEmployees],
  );

  const managerFilterLabel = useMemo(() => {
    const selectedCount = activeManagerEmployeeIdSet.size;

    if (
      selectedManagerEmployeeIds.length === 0 &&
      selectedManagerGroupIds.length === 0
    ) {
      return t("calendar.managerAllEmployees");
    }

    if (
      selectedManagerGroupIds.length === 1 &&
      selectedManagerEmployeeIds.length === 0
    ) {
      return (
        managerGroups.find((group) => group.id === selectedManagerGroupIds[0])
          ?.name ?? t("calendar.managerSelectedEmployees", { count: selectedCount })
      );
    }

    if (
      selectedManagerEmployeeIds.length === 1 &&
      selectedManagerGroupIds.length === 0
    ) {
      const employee = managerEmployeeDirectory.get(selectedManagerEmployeeIds[0]);
      return employee
        ? buildEmployeeName(employee.firstName, employee.lastName)
        : t("calendar.managerSelectedEmployees", { count: selectedCount });
    }

    return t("calendar.managerSelectedEmployees", { count: selectedCount });
  }, [
    activeManagerEmployeeIdSet.size,
    managerEmployeeDirectory,
    managerGroups,
    selectedManagerEmployeeIds,
    selectedManagerGroupIds,
    t,
  ]);
  const managerFilterSheetItemCount =
    1 + managerGroups.length + sortedManagerEmployees.length;
  const shouldScrollManagerFilterSheet = managerFilterSheetItemCount > 5;

  const managerShiftsForSelectedDay = useMemo(() => {
    return managerShifts.filter((shift) => {
      const date = new Date(shift.shiftDate);
      return !Number.isNaN(date.getTime()) && formatDateKey(date) === selectedDayKey;
    });
  }, [managerShifts, selectedDayKey]);

  const managerShiftByEmployeeId = useMemo(() => {
    return new Map(
      managerShiftsForSelectedDay.map((shift) => [shift.employeeId, shift]),
    );
  }, [managerShiftsForSelectedDay]);

  const managerTasksForSelectedDay = useMemo(() => {
    return tasks
      .filter((task) => {
        const date = getTaskCalendarDate(task);
        return date && formatDateKey(date) === selectedDayKey;
      })
      .sort((left, right) => {
        const leftDate = getTaskCalendarDate(left)?.getTime() ?? 0;
        const rightDate = getTaskCalendarDate(right)?.getTime() ?? 0;
        return leftDate - rightDate;
      });
  }, [selectedDayKey, tasks]);

  const managerEmployeeRows = useMemo(() => {
    return visibleManagerEmployees.map((employee) => {
      const assignedTasks = managerTasksForSelectedDay.filter(
        (task) => getTaskAssigneeId(task) === employee.id,
      );
      const plannedTasks = assignedTasks.filter(
        (task) => task.status !== "CANCELLED",
      );
      const doneTasks = plannedTasks.filter((task) => task.status === "DONE");

      return {
        employee,
        shift: managerShiftByEmployeeId.get(employee.id) ?? null,
        assignedTasks,
        plannedTasks,
        doneTasks,
      };
    });
  }, [
    managerShiftByEmployeeId,
    managerTasksForSelectedDay,
    visibleManagerEmployees,
  ]);

  const managerDaySummary = useMemo(() => {
    const total = managerEmployeeRows.reduce(
      (sum, row) => sum + row.plannedTasks.length,
      0,
    );
    const done = managerEmployeeRows.reduce(
      (sum, row) => sum + row.doneTasks.length,
      0,
    );
    const employeesWithOpenTasks = managerEmployeeRows.filter((row) =>
      row.plannedTasks.some((task) => isTaskOpen(task.status)),
    ).length;

    return {
      done,
      total,
      employees: managerEmployeeRows.length,
      shifts: managerShiftsForSelectedDay.length,
      employeesWithOpenTasks,
    };
  }, [managerEmployeeRows, managerShiftsForSelectedDay.length]);

  useEffect(() => {
    if (!assignShiftSheetVisible) {
      return;
    }

    if (!assignShiftEmployeeId && visibleManagerEmployees[0]) {
      setAssignShiftEmployeeId(visibleManagerEmployees[0].id);
    }

    if (!assignShiftTemplateId && shiftTemplates[0]) {
      setAssignShiftTemplateId(shiftTemplates[0].id);
    }
  }, [
    assignShiftEmployeeId,
    assignShiftSheetVisible,
    assignShiftTemplateId,
    shiftTemplates,
    visibleManagerEmployees,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    void writeScreenCache(calendarCacheKey, {
      shifts,
      tasks,
      managerEmployees,
      managerGroups,
      managerShifts,
      shiftTemplates,
    });
  }, [
    calendarCacheKey,
    loading,
    managerEmployees,
    managerGroups,
    managerShifts,
    shiftTemplates,
    shifts,
    tasks,
  ]);

  const selectedShift = shiftByDateKey.get(selectedDayKey) ?? null;
  const selectedItems = itemsByDateKey.get(selectedDayKey) ?? [];
  const selectedTaskCount = selectedItems.filter(
    (item) => item.kind === "task",
  ).length;
  const selectedMeetingCount = selectedItems.filter(
    (item) => item.kind === "meeting",
  ).length;
  const selectedSummaryText =
    selectedTaskCount > 0 && selectedMeetingCount > 0
      ? t("calendar.countSummary", {
          tasks: tp(
            selectedTaskCount,
            ["задача", "задачи", "задач"],
            ["task", "tasks"],
          ),
          meetings: tp(
            selectedMeetingCount,
            ["встреча", "встречи", "встреч"],
            ["meeting", "meetings"],
          ),
        })
      : selectedTaskCount > 0
        ? tp(
            selectedTaskCount,
            ["задача", "задачи", "задач"],
            ["task", "tasks"],
          )
        : selectedMeetingCount > 0
          ? tp(
              selectedMeetingCount,
              ["встреча", "встречи", "встреч"],
              ["meeting", "meetings"],
            )
          : null;

  const selectedDayRelation =
    startOfDay(selectedDate).getTime() < todayStart.getTime()
      ? "past"
      : startOfDay(selectedDate).getTime() > todayStart.getTime()
        ? "future"
        : "today";

  const selectedDayLabel = selectedDate.toLocaleString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const rescheduleActionsOffset = 15;
  const canAssignShiftForSelectedDay =
    startOfDay(selectedDate).getTime() >= todayStart.getTime();

  function toggleManagerEmployeeFilter(employeeId: string) {
    hapticSelection();
    setSelectedManagerEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function toggleManagerGroupFilter(groupId: string) {
    hapticSelection();
    setSelectedManagerGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  function toggleManagerGroupExpanded(groupId: string) {
    hapticSelection();
    setExpandedManagerGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  function clearManagerFilter() {
    hapticSelection();
    setSelectedManagerEmployeeIds([]);
    setSelectedManagerGroupIds([]);
  }

  function toggleManagerEmployeeExpanded(employeeId: string) {
    hapticSelection();
    setExpandedManagerEmployeeId((current) =>
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

  function openAssignShiftSheet(employeeId?: string) {
    hapticSelection();
    setAssignShiftError(null);
    setAssignShiftEmployeeId(employeeId ?? visibleManagerEmployees[0]?.id ?? "");
    setAssignShiftTemplateId(shiftTemplates[0]?.id ?? "");
    setAssignShiftSheetVisible(true);
  }

  async function submitManagerShiftAssignment() {
    if (!assignShiftEmployeeId || !assignShiftTemplateId) {
      setAssignShiftError(t("calendar.assignShiftValidation"));
      return;
    }

    if (!canAssignShiftForSelectedDay) {
      setAssignShiftError(t("calendar.assignShiftPastDate"));
      return;
    }

    setAssignShiftSubmitting(true);
    setAssignShiftError(null);

    try {
      const createdShift = await createManagerShift({
        employeeId: assignShiftEmployeeId,
        templateId: assignShiftTemplateId,
        shiftDate: selectedDayKey,
      });

      setManagerShifts((current) => [createdShift, ...current]);
      setAssignShiftSheetVisible(false);
      setAssignShiftEmployeeId("");
      setAssignShiftTemplateId("");
    } catch (nextError) {
      setAssignShiftError(
        nextError instanceof Error
          ? nextError.message
          : t("calendar.assignShiftError"),
      );
    } finally {
      setAssignShiftSubmitting(false);
    }
  }

  function renderManagerTaskLeading(task: TaskItem) {
    if (isTaskMeeting(task)) {
      return <Ionicons color="#6d73ff" name="videocam-outline" size={18} />;
    }

    if (task.requiresPhoto) {
      return <Ionicons color="#6d73ff" name="camera-outline" size={18} />;
    }

    if (task.status === "DONE") {
      return <Ionicons color="#16a34a" name="checkmark-circle" size={18} />;
    }

    return <Ionicons color="#9aa6b2" name="ellipse-outline" size={18} />;
  }

  function changeMonth(offset: number) {
    hapticSelection();
    setMonthAnimationDirection(offset > 0 ? "next" : "prev");
    setCurrentDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function openTaskDay(task: TaskItem) {
    const dueAt = parseTaskDueAt(task);
    if (!dueAt) {
      return;
    }

    hapticSelection();
    setCurrentDate(new Date(dueAt.getFullYear(), dueAt.getMonth(), 1));
    setSelectedDay(dueAt.getDate());
    setOverdueSheetVisible(false);
  }

  function openRescheduleSheet(task: TaskItem) {
    const sourceDueAt = parseTaskDueAt(task) ?? today;
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const initialDate = new Date(
      nextDay.getFullYear(),
      nextDay.getMonth(),
      nextDay.getDate(),
    );
    const initialDateTime = new Date(initialDate);
    initialDateTime.setHours(
      sourceDueAt.getHours(),
      sourceDueAt.getMinutes(),
      0,
      0,
    );

    setRescheduleTaskItem(task);
    setRescheduleDateValue(initialDate);
    setRescheduleTimeValue({
      hour: initialDateTime.getHours(),
      minute: initialDateTime.getMinutes(),
    });
    setRescheduleDatePickerVisible(false);
    setOverdueSheetVisible(false);
    setRescheduleSheetVisible(true);
  }

  function handleRescheduleDateChange(
    event: DateTimePickerEvent,
    pickedDate?: Date,
  ) {
    if (Platform.OS === "android") {
      setRescheduleDatePickerVisible(false);
    }

    if (event.type === "dismissed" || !pickedDate) {
      return;
    }

    setRescheduleDateValue(startOfDay(pickedDate));
  }

  function syncTaskInState(
    updatedTask: TaskItem,
    replacedTaskId?: string | null,
  ) {
    setTasks((current) => {
      const next = replacedTaskId
        ? current.filter((task) => task.id !== replacedTaskId)
        : [...current];
      const existingIndex = next.findIndex(
        (task) => task.id === updatedTask.id,
      );

      if (existingIndex >= 0) {
        next[existingIndex] = updatedTask;
        return next;
      }

      return [updatedTask, ...next];
    });
  }

  async function markTaskDone(taskId: string) {
    setPendingTaskId(taskId);
    setPendingTaskAction("done");
    setError(null);

    try {
      const updatedTask = await updateMyTaskStatus(taskId, "DONE");
      syncTaskInState(updatedTask);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("today.taskUpdateError"),
      );
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  async function deleteTask(taskId: string) {
    setPendingTaskId(taskId);
    setPendingTaskAction("delete");
    setError(null);

    try {
      const updatedTask = await updateMyTaskStatus(taskId, "CANCELLED");
      syncTaskInState(updatedTask);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("today.taskUpdateError"),
      );
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  async function submitTaskReschedule() {
    if (!rescheduleTaskItem) {
      return;
    }

    const nextDueAt = combineDateAndTime(
      rescheduleDateValue,
      rescheduleTimeValue,
    );
    if (nextDueAt.getTime() <= Date.now()) {
      setError(t("calendar.moveToAnotherDayHint"));
      return;
    }

    setPendingTaskId(rescheduleTaskItem.id);
    setPendingTaskAction("reschedule");
    setError(null);

    try {
      const result = await rescheduleMyTask(
        rescheduleTaskItem.id,
        nextDueAt.toISOString(),
      );
      syncTaskInState(result.task, result.replacedTaskId);
      setRescheduleSheetVisible(false);
      setRescheduleDatePickerVisible(false);
      setRescheduleTimePickerVisible(false);
      setRescheduleTaskItem(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("today.taskUpdateError"),
      );
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  function renderOverdueTaskActions(
    task: TaskItem,
    includeOpenTaskDay = false,
  ) {
    const isPendingForTask = pendingTaskId === task.id;

    return (
      <View className="mt-4 gap-2">
        <View className="flex-row gap-2">
          <Button
            className="min-h-11 flex-1 border-[#dce4f2] bg-white"
            disabled={isPendingForTask}
            label={
              isPendingForTask && pendingTaskAction === "reschedule"
                ? t("common.processing")
                : t("calendar.rescheduleTask")
            }
            onPress={() => openRescheduleSheet(task)}
            textClassName="text-[13px] text-foreground"
            variant="secondary"
          />
          {includeOpenTaskDay ? (
            <Button
              className="min-h-11 flex-1 border-[#dce4f2] bg-white"
              disabled={isPendingForTask}
              label={t("calendar.openTaskDay")}
              onPress={() => openTaskDay(task)}
              textClassName="text-[13px] text-foreground"
              variant="secondary"
            />
          ) : null}
          <PressableScale
            className={`min-h-11 min-w-11 items-center justify-center rounded-2xl border px-3 ${
              isPendingForTask && pendingTaskAction === "delete"
                ? "border-[#fecdd3] bg-[#fff1f2] opacity-60"
                : "border-[#fecdd3] bg-[#fff1f2]"
            }`}
            disabled={isPendingForTask}
            haptic="selection"
            onPress={() => {
              void deleteTask(task.id);
            }}
          >
            <Ionicons color="#dc2626" name="trash-outline" size={18} />
          </PressableScale>
          <PressableScale
            className={`min-h-11 min-w-11 items-center justify-center rounded-2xl border px-3 ${
              isPendingForTask && pendingTaskAction === "done"
                ? "border-[#bbf7d0] bg-[#ecfdf3] opacity-60"
                : "border-[#bbf7d0] bg-[#ecfdf3]"
            }`}
            disabled={isPendingForTask}
            haptic="selection"
            onPress={() => {
              void markTaskDone(task.id);
            }}
          >
            <Ionicons color="#169c56" name="checkmark" size={20} />
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <>
      <View className="flex-1 bg-transparent">
        {active ? (
          <StatusBar backgroundColor="transparent" style="dark" translucent />
        ) : null}
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{
            paddingBottom: 112,
            paddingHorizontal: 16,
            paddingTop: insets.top + 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
            <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
              <View className="mb-5 flex-row items-center justify-between">
                <PressableScale
                  className="rounded-xl p-2"
                  haptic="selection"
                  onPress={() => changeMonth(-1)}
                >
                  <Ionicons
                    color="#27364b"
                    name="chevron-back"
                    size={20}
                    style={directionalIconStyle}
                  />
                </PressableScale>
                <View className="min-w-[140px] overflow-hidden">
                  <Animated.Text
                    entering={
                      monthAnimationDirection === "next"
                        ? FadeInRight.duration(190).withInitialValues({
                            opacity: 0,
                            transform: [{ translateX: 10 }],
                          })
                        : FadeInLeft.duration(190).withInitialValues({
                            opacity: 0,
                            transform: [{ translateX: -10 }],
                          })
                    }
                    exiting={
                      monthAnimationDirection === "next"
                        ? FadeOutLeft.duration(170)
                        : FadeOutRight.duration(170)
                    }
                    key={monthKey}
                    className="text-center font-display text-base font-semibold text-foreground"
                  >
                    {month}
                  </Animated.Text>
                </View>
                <PressableScale
                  className="rounded-xl p-2"
                  haptic="selection"
                  onPress={() => changeMonth(1)}
                >
                  <Ionicons
                    color="#27364b"
                    name="chevron-forward"
                    size={20}
                    style={directionalIconStyle}
                  />
                </PressableScale>
              </View>

              <View className="overflow-hidden">
                <Animated.View
                  entering={
                    monthAnimationDirection === "next"
                      ? FadeInRight.duration(190).withInitialValues({
                          opacity: 0,
                          transform: [{ translateX: 14 }],
                        })
                      : FadeInLeft.duration(190).withInitialValues({
                          opacity: 0,
                          transform: [{ translateX: -14 }],
                        })
                  }
                  exiting={
                    monthAnimationDirection === "next"
                      ? FadeOutLeft.duration(170)
                      : FadeOutRight.duration(170)
                  }
                  key={monthKey}
                >
                  <View className="mb-2 flex-row flex-wrap">
                    {weekdayLabels.map((day) => (
                      <View
                        key={day}
                        className="mb-2 items-center justify-center"
                        style={{ width: "14.28%" }}
                      >
                        <Text className="py-1 text-center font-body text-xs font-medium text-muted-foreground">
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row flex-wrap">
                    {cells.map((day, index) => (
                      <View
                        key={`${day}-${index}`}
                        className="mb-2 items-center justify-center"
                        style={{ width: "14.28%" }}
                      >
                        {day !== null ? (
                          <PressableScale
                            className="h-10 w-10 items-center justify-center rounded-full"
                            contentStyle={[
                              day === selectedDay
                                ? {
                                    backgroundColor: "#6d73ff",
                                    borderRadius: 999,
                                    shadowColor: "#6d73ff",
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 3,
                                  }
                                : null,
                              day !== selectedDay &&
                              isCurrentMonth &&
                              day === today.getDate()
                                ? {
                                    backgroundColor:
                                      "rgba(109, 115, 255, 0.15)",
                                    borderRadius: 999,
                                  }
                                : null,
                            ]}
                            haptic="selection"
                            onPress={() => setSelectedDay(day)}
                          >
                            <Text
                              className="font-body text-sm font-medium"
                              style={{
                                color:
                                  day === selectedDay ? "#ffffff" : "#111827",
                              }}
                            >
                              {day}
                            </Text>
                            <View
                              className="mt-0.5 h-1 w-1 rounded-full bg-primary"
                              style={{ opacity: eventDays.has(day) ? 1 : 0 }}
                            />
                          </PressableScale>
                        ) : (
                          <View className="h-10 w-10" />
                        )}
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </View>
            </View>

            {error ? (
              <View className="rounded-3xl border border-danger/20 bg-danger/10 p-5 shadow-sm shadow-[#1f2687]/10">
                <Text className="font-body text-[14px] leading-6 text-danger">
                  {error}
                </Text>
              </View>
            ) : null}

            {isManager ? (
              <View className="gap-4">
                <PressableScale
                  className="min-h-[58px] rounded-[24px] bg-white px-5 py-4 shadow-sm shadow-[#1f2687]/10"
                  haptic="selection"
                  onPress={() => setManagerFilterSheetVisible(true)}
                >
                  <View className="flex-row items-center justify-between gap-4">
                    <Text
                      className="min-w-0 flex-1 font-display text-[19px] font-bold text-foreground"
                      numberOfLines={1}
                    >
                      {managerFilterLabel}
                    </Text>
                    <Ionicons color="#315cf6" name="options-outline" size={22} />
                  </View>
                </PressableScale>

                <View className="rounded-[30px] border border-white/40 bg-white/78 p-5 shadow-sm shadow-[#1f2687]/10">
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="font-display text-[22px] font-bold text-foreground">
                        {selectedDayLabel}
                      </Text>
                      <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                        {t("calendar.managerDaySummary", {
                          done: managerDaySummary.done,
                          total: managerDaySummary.total,
                          shifts: managerDaySummary.shifts,
                        })}
                      </Text>
                    </View>
                    <PressableScale
                      className={`min-h-[44px] rounded-2xl px-4 py-3 ${
                        canAssignShiftForSelectedDay
                          ? "bg-[#2563eb]"
                          : "bg-[#dbe3ef]"
                      }`}
                      disabled={!canAssignShiftForSelectedDay}
                      haptic="selection"
                      onPress={() => openAssignShiftSheet()}
                    >
                      <View className="flex-row items-center gap-2">
                        <Ionicons color="#ffffff" name="calendar-outline" size={16} />
                        <Text className="font-display text-[13px] font-semibold text-white">
                          {t("calendar.assignShift")}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <View className="flex-1 rounded-2xl bg-[#f4f7fb] px-3 py-3">
                      <Text className="font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#8a96ab]">
                        {t("calendar.managerProgress")}
                      </Text>
                      <Text
                        className="mt-1 font-display text-[22px] font-bold text-foreground"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {managerDaySummary.done}/{managerDaySummary.total}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-2xl bg-[#f4f7fb] px-3 py-3">
                      <Text className="font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#8a96ab]">
                        {t("calendar.managerNeedsAttention")}
                      </Text>
                      <Text
                        className="mt-1 font-display text-[22px] font-bold text-foreground"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {managerDaySummary.employeesWithOpenTasks}
                      </Text>
                    </View>
                  </View>
                </View>

                {loading ? (
                  <View className="rounded-[28px] border border-white/40 bg-white/78 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
                    <Text className="font-body text-sm text-muted-foreground">
                      {t("common.loading")}
                    </Text>
                  </View>
                ) : managerEmployeeRows.length ? (
                  <View className="overflow-hidden rounded-[30px] border border-white/40 bg-white/78 shadow-sm shadow-[#1f2687]/10">
                    {managerEmployeeRows.map((row, index) => {
                      const isExpanded =
                        expandedManagerEmployeeId === row.employee.id;
                      const showAvatar =
                        row.employee.avatar &&
                        !failedAvatarEmployeeIds.has(row.employee.id);
                      const subtitle = getEmployeeSubtitle(row.employee);
                      const isLast = index === managerEmployeeRows.length - 1;

                      return (
                        <Animated.View
                          entering={FadeInUp.delay(index * 18)
                            .duration(170)
                            .withInitialValues({
                              opacity: 0,
                              transform: [{ translateY: 8 }],
                            })}
                          key={row.employee.id}
                        >
                          <PressableScale
                            className="px-5 py-5"
                            haptic="selection"
                            onPress={() =>
                              toggleManagerEmployeeExpanded(row.employee.id)
                            }
                          >
                            <View className="flex-row items-center gap-3">
                              <View className="w-5 items-center">
                                <Ionicons
                                  color="#6b7a90"
                                  name={isExpanded ? "chevron-up" : "chevron-down"}
                                  size={20}
                                />
                              </View>
                              {showAvatar ? (
                                <Image
                                  className="h-13 w-13 rounded-2xl"
                                  onError={() => markAvatarFailed(row.employee.id)}
                                  resizeMode="cover"
                                  source={row.employee.avatar}
                                />
                              ) : (
                                <View className="h-13 w-13 items-center justify-center rounded-2xl bg-[#eef2ff]">
                                  <Text className="font-display text-[15px] font-extrabold text-foreground">
                                    {getEmployeeInitials(
                                      row.employee.firstName,
                                      row.employee.lastName,
                                    )}
                                  </Text>
                                </View>
                              )}
                              <View className="min-w-0 flex-1">
                                <Text
                                  className="font-display text-[18px] font-bold text-foreground"
                                  numberOfLines={1}
                                >
                                  {buildEmployeeName(
                                    row.employee.firstName,
                                    row.employee.lastName,
                                  )}
                                </Text>
                                <Text
                                  className="mt-1 font-body text-[13px] leading-5 text-[#7b8798]"
                                  numberOfLines={1}
                                >
                                  {row.shift
                                    ? `${row.shift.template.name} · ${formatShiftRange(row.shift, locale)}`
                                    : subtitle}
                                </Text>
                              </View>
                              <View className="items-end">
                                <Text
                                  className="font-display text-[18px] font-bold text-foreground"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {row.doneTasks.length}/{row.plannedTasks.length}
                                </Text>
                                <Text className="mt-1 font-body text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8a96ab]">
                                  {t("calendar.tasksShort")}
                                </Text>
                              </View>
                            </View>

                            {isExpanded ? (
                              <View className="mt-4 gap-3 border-t border-[#e4ebf5] pt-4">
                                <View className="flex-row items-center justify-between gap-3">
                                  <Text className="font-body text-[14px] font-semibold text-[#42526b]">
                                    {t("manager.tasksToday")}
                                  </Text>
                                  {row.shift ? (
                                    <View className="rounded-full bg-[#e8fff3] px-3 py-1.5">
                                      <Text className="font-body text-[12px] font-semibold text-[#0f766e]">
                                        {formatShiftRange(row.shift, locale)}
                                      </Text>
                                    </View>
                                  ) : canAssignShiftForSelectedDay ? (
                                    <PressableScale
                                      className="rounded-full bg-[#eef4ff] px-3 py-1.5"
                                      haptic="selection"
                                      onPress={() =>
                                        openAssignShiftSheet(row.employee.id)
                                      }
                                    >
                                      <Text className="font-body text-[12px] font-semibold text-[#315cf6]">
                                        {t("calendar.assignShiftShort")}
                                      </Text>
                                    </PressableScale>
                                  ) : null}
                                </View>

                                {row.assignedTasks.length ? (
                                  <View className="gap-1">
                                    {row.assignedTasks.map((task) => {
                                      const isDone = task.status === "DONE";
                                      const title = getTaskTitle(task, {
                                        normalize: true,
                                        hideSourceBeforeReady: true,
                                      });
                                      const note =
                                        getTaskMeetingLocation(task, {
                                          hideSourceBeforeReady: true,
                                        }) ||
                                        getTaskBody(task, {
                                          hideSourceBeforeReady: true,
                                        });

                                      return (
                                        <View
                                          className="flex-row items-start gap-3 px-1 py-2"
                                          key={task.id}
                                        >
                                          <View className="w-6 items-center pt-0.5">
                                            {renderManagerTaskLeading(task)}
                                          </View>
                                          <View className="flex-1">
                                            <Text
                                              className={`font-body text-[15px] leading-6 ${
                                                isDone
                                                  ? "text-[#16a34a] line-through"
                                                  : "text-foreground"
                                              }`}
                                            >
                                              {title || task.title}
                                            </Text>
                                            {note ? (
                                              <Text
                                                className="mt-0.5 font-body text-[12px] leading-5 text-[#7b8798]"
                                                numberOfLines={2}
                                              >
                                                {note}
                                              </Text>
                                            ) : null}
                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                ) : (
                                  <View className="rounded-2xl bg-[#f8fbff] px-4 py-5">
                                    <Text className="text-center font-body text-[13px] leading-5 text-[#6b7280]">
                                      {t("manager.noEmployeeTasks")}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ) : null}
                          </PressableScale>

                          {!isLast ? <View className="h-px bg-[#edf1f7]" /> : null}
                        </Animated.View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="rounded-[28px] border border-white/40 bg-white/78 px-5 py-6 shadow-sm shadow-[#1f2687]/10">
                    <Text className="text-center font-body text-sm leading-6 text-muted-foreground">
                      {t("calendar.managerNoEmployeesForFilter")}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {overdueTasks.length > 0 ? (
              <PressableScale
                className="rounded-3xl border border-warning/25 bg-white/78 p-5 shadow-sm shadow-[#1f2687]/10"
                haptic="selection"
                onPress={() => setOverdueSheetVisible(true)}
              >
                <View className="flex-row items-start gap-4">
                  <View className="mt-0.5 h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4dd]">
                    <Ionicons
                      color="#f59e0b"
                      name="warning-outline"
                      size={22}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-lg font-bold text-foreground">
                      {t("calendar.overdueManagerTitle", {
                        count: overdueTasks.length,
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    color="#f59e0b"
                    name="chevron-forward"
                    size={18}
                    style={directionalIconStyle}
                  />
                </View>
              </PressableScale>
            ) : null}

            {!isManager ? (
              <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-display text-xl font-bold text-foreground">
                      {t("calendar.newsTitle")}
                    </Text>
                    <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                      {t("calendar.newsSubtitle")}
                    </Text>
                  </View>
                  <View className="rounded-full bg-[#eef4ff] px-3 py-1.5">
                    <Text className="font-body text-xs font-semibold text-[#4f6df5]">
                      {announcements.length}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 gap-3">
                  {latestAnnouncements.length ? (
                    latestAnnouncements.map((item) => (
                      <View
                        className="rounded-2xl border border-[#e8edf6] bg-[#f8fbff] px-4 py-4"
                        key={item.id}
                      >
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              {item.isPinned ? (
                                <View className="rounded-full bg-[#e0edff] px-2.5 py-1">
                                  <Text className="font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#2553d8]">
                                    {t("calendar.newsPinned")}
                                  </Text>
                                </View>
                              ) : null}
                              <Text className="font-body text-[12px] font-semibold text-[#64748b]">
                                {formatAnnouncementDate(
                                  item.publishedAt ?? item.createdAt,
                                  locale,
                                )}
                              </Text>
                            </View>
                            <Text className="mt-3 font-display text-[17px] font-bold text-foreground">
                              {item.title}
                            </Text>
                            {item.body ? (
                              <Text
                                className="mt-2 font-body text-[14px] leading-6 text-muted-foreground"
                                numberOfLines={3}
                              >
                                {item.body}
                              </Text>
                            ) : null}
                          </View>
                          <View className="mt-0.5 h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff]">
                            <Ionicons
                              color="#4f6df5"
                              name="newspaper-outline"
                              size={20}
                            />
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className="rounded-2xl border border-dashed border-[#d7deeb] bg-[#f8fafc] px-4 py-4">
                      <Text className="font-body text-sm leading-6 text-muted-foreground">
                        {t("calendar.newsEmpty")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {!isManager ? (
              <>
                <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="font-display text-xl font-bold text-foreground">
                        {selectedDayLabel}
                      </Text>
                      <Text className="mt-1 font-body text-sm text-muted-foreground">
                        {loading
                          ? t("common.loading")
                          : selectedShift
                            ? `${selectedShift.template.name} · ${new Date(selectedShift.startsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} - ${new Date(selectedShift.endsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
                            : selectedDayRelation === "past"
                              ? t("calendar.noShiftRecorded")
                              : t("calendar.dayOff")}
                      </Text>
                      {selectedShift ? (
                        <Text className="mt-1 font-body text-sm text-muted-foreground">
                          {selectedShift.location.name}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className="font-body text-xs font-semibold"
                      style={{ color: selectedShift ? "#169c56" : "#6b7280" }}
                    >
                      {selectedShift ? t("calendar.workDay") : t("calendar.dayOff")}
                    </Text>
                  </View>
                </View>

                <View>
                  <View className="mb-3 flex-row items-center justify-between gap-3 px-5">
                    <Text className="font-display text-lg font-semibold text-foreground">
                      {selectedDayRelation === "past"
                        ? t("calendar.activityOnDay")
                        : t("calendar.planForDay")}
                    </Text>
                    {selectedSummaryText ? (
                      <View className="rounded-full bg-[#eef4ff] px-3 py-1.5">
                        <Text className="font-body text-xs font-semibold text-[#4f6df5]">
                          {selectedSummaryText}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {loading ? (
                    <View className="rounded-2xl border border-white/30 bg-white/70 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
                      <Text className="font-body text-sm text-muted-foreground">
                        {t("common.loading")}
                      </Text>
                    </View>
                  ) : selectedItems.length > 0 ? (
                    selectedItems.map((item) => (
                      <View
                        key={item.id}
                        className="mb-2 rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                      >
                    <View className="flex-row items-center justify-between">
                      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff]">
                        <Ionicons
                          color={
                            item.kind === "meeting"
                              ? "#6d73ff"
                              : item.status === "done"
                                ? "#10b981"
                                : item.status === "cancelled"
                                  ? "#ef4444"
                                  : item.status === "overdue"
                                    ? "#ef4444"
                                    : "#10b981"
                          }
                          name={
                            item.kind === "meeting"
                              ? "videocam-outline"
                              : item.status === "done"
                                ? "checkmark-circle"
                                : item.status === "cancelled"
                                  ? "close-circle-outline"
                                  : item.status === "overdue"
                                    ? "alert-circle-outline"
                                    : "clipboard-outline"
                          }
                          size={20}
                        />
                      </View>
                      <View className="flex-1">
                        {item.title ? (
                          <Text className="font-body text-[15px] font-medium text-foreground">
                            {item.title}
                          </Text>
                        ) : (
                          <View className="mt-1 h-4 w-[64%] rounded-full bg-[#e2eaf6]" />
                        )}
                        {item.note ? (
                          <Text className="mt-1 font-body text-sm text-muted-foreground">
                            {item.note}
                          </Text>
                        ) : (
                          <View className="mt-2 h-3 w-[46%] rounded-full bg-[#edf3fb]" />
                        )}
                      </View>
                      <Text
                        className="font-body text-xs font-semibold"
                        style={{
                          color:
                            item.status === "done"
                              ? "#169c56"
                              : item.status === "cancelled"
                                ? "#ef4444"
                                : item.status === "overdue"
                                  ? "#ef4444"
                                  : "#4f6df5",
                        }}
                      >
                        {item.status === "done"
                          ? t("calendar.statusDone")
                          : item.status === "cancelled"
                            ? t("calendar.statusDeleted")
                            : item.status === "overdue"
                              ? t("calendar.statusOverdue")
                              : item.kind === "meeting"
                                ? t("calendar.statusMeeting")
                                : t("calendar.statusPlanned")}
                      </Text>
                    </View>
                    {item.kind === "task" && item.status === "overdue"
                      ? renderOverdueTaskActions(item.task)
                      : null}
                  </View>
                ))
              ) : (
                <View className="min-h-[120px] items-center justify-start px-6 pt-12">
                  <Text className="text-center font-body text-[15px] font-medium text-[#9aa6b2]">
                    {t("calendar.noItemsForDay")}
                  </Text>
                </View>
              )}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        onClose={() => setManagerFilterSheetVisible(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={managerFilterSheetVisible}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">
              {t("calendar.managerFilterTitle")}
            </Text>
          </View>
          <PressableScale
            className="h-10 min-w-[72px] items-center justify-center rounded-full px-3"
            haptic="selection"
            onPress={() => setManagerFilterSheetVisible(false)}
          >
            <Text className="text-[15px] font-semibold text-foreground">
              {t("common.done")}
            </Text>
          </PressableScale>
        </View>

        {loading ? (
          <Text className="text-[14px] text-muted-foreground">
            {t("common.loading")}
          </Text>
        ) : (
          <View className={shouldScrollManagerFilterSheet ? "max-h-[440px]" : ""}>
            <ScrollView
              scrollEnabled={shouldScrollManagerFilterSheet}
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-4">
                <PressableScale
                  className={`rounded-[24px] border px-4 py-4 shadow-sm shadow-[#1f2687]/10 ${
                    selectedManagerEmployeeIds.length === 0 &&
                    selectedManagerGroupIds.length === 0
                      ? "border-primary bg-[#eef4ff]"
                      : "border-white/30 bg-white"
                  }`}
                  haptic="selection"
                  onPress={clearManagerFilter}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full border ${
                        selectedManagerEmployeeIds.length === 0 &&
                        selectedManagerGroupIds.length === 0
                          ? "border-primary bg-primary"
                          : "border-[#d7deeb] bg-white"
                      }`}
                    >
                      {selectedManagerEmployeeIds.length === 0 &&
                      selectedManagerGroupIds.length === 0 ? (
                        <Ionicons color="#ffffff" name="checkmark" size={15} />
                      ) : null}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-display text-[16px] font-bold text-foreground"
                        numberOfLines={1}
                      >
                        {t("calendar.managerAllEmployees")}
                      </Text>
                    </View>
                  </View>
                </PressableScale>

              {managerGroups.length ? (
                <View className="gap-3">
                  <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                    {t("manager.meetingGroups")}
                  </Text>
                  {managerGroups.map((group) => {
                    const isSelected = selectedManagerGroupIds.includes(group.id);
                    const isExpanded = expandedManagerGroupIds.includes(group.id);

                    return (
                      <View
                        className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                        key={group.id}
                      >
                        <View className="flex-row items-center gap-3">
                          <PressableScale
                            className={`h-7 w-7 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-[#d7deeb] bg-white"
                            }`}
                            haptic="selection"
                            onPress={() => toggleManagerGroupFilter(group.id)}
                          >
                            {isSelected ? (
                              <Ionicons color="#ffffff" name="checkmark" size={15} />
                            ) : null}
                          </PressableScale>
                          <View className="flex-1">
                            <Text className="font-display text-[16px] font-bold text-foreground">
                              {group.name}
                            </Text>
                            <Text className="mt-1 font-body text-[13px] text-muted-foreground">
                              {t("manager.groupMembersCount", {
                                count: group.memberships.length,
                              })}
                            </Text>
                          </View>
                          <PressableScale
                            className="h-9 w-9 items-center justify-center rounded-full bg-[#f4f7fb]"
                            haptic="selection"
                            onPress={() => toggleManagerGroupExpanded(group.id)}
                          >
                            <Ionicons
                              color="#4b5563"
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                            />
                          </PressableScale>
                        </View>

                        {isExpanded ? (
                          <View className="mt-4 border-t border-[#e7ecf5] pt-2">
                            {group.memberships.map((membership, index) => {
                              const employee =
                                managerEmployeeDirectory.get(membership.employeeId) ??
                                ({
                                  id: membership.employee.id,
                                  firstName: membership.employee.firstName,
                                  lastName: membership.employee.lastName,
                                  employeeNumber: membership.employee.employeeNumber,
                                  email: "",
                                  department: null,
                                  position: null,
                                  primaryLocation: null,
                                } satisfies ManagerEmployee);
                              const selectedByEmployee =
                                selectedManagerEmployeeIds.includes(employee.id);
                              const selectedByGroup = selectedGroupEmployeeIds.has(
                                employee.id,
                              );

                              return (
                                <PressableScale
                                  className={`px-1 py-3 ${
                                    index < group.memberships.length - 1
                                      ? "border-b border-[#e7ecf5]"
                                      : ""
                                  }`}
                                  haptic="selection"
                                  key={membership.id}
                                  onPress={() =>
                                    toggleManagerEmployeeFilter(employee.id)
                                  }
                                >
                                  <View className="flex-row items-center gap-3">
                                    <View
                                      className={`h-6 w-6 items-center justify-center rounded-full border ${
                                        selectedByEmployee || selectedByGroup
                                          ? "border-primary bg-primary"
                                          : "border-[#d7deeb] bg-white"
                                      }`}
                                    >
                                      {selectedByEmployee || selectedByGroup ? (
                                        <Ionicons
                                          color="#ffffff"
                                          name="checkmark"
                                          size={13}
                                        />
                                      ) : null}
                                    </View>
                                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                                      <Text className="font-display text-[12px] font-extrabold text-foreground">
                                        {getEmployeeInitials(
                                          employee.firstName,
                                          employee.lastName,
                                        )}
                                      </Text>
                                    </View>
                                    <View className="flex-1">
                                      <Text className="font-body text-[14px] font-semibold text-foreground">
                                        {buildEmployeeName(
                                          employee.firstName,
                                          employee.lastName,
                                        )}
                                      </Text>
                                    </View>
                                  </View>
                                </PressableScale>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View className="gap-3">
                <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  {t("manager.meetingEmployees")}
                </Text>
                <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                  {sortedManagerEmployees.length ? (
                    sortedManagerEmployees.map((employee, index) => {
                      const selectedByEmployee =
                        selectedManagerEmployeeIds.includes(employee.id);
                      const selectedByGroup = selectedGroupEmployeeIds.has(
                        employee.id,
                      );
                      const showAvatar =
                        employee.avatar && !failedAvatarEmployeeIds.has(employee.id);

                      return (
                        <PressableScale
                          className={`py-3 ${
                            index < sortedManagerEmployees.length - 1
                              ? "border-b border-[#e7ecf5]"
                              : ""
                          }`}
                          haptic="selection"
                          key={employee.id}
                          onPress={() => toggleManagerEmployeeFilter(employee.id)}
                        >
                          <View className="flex-row items-center gap-3">
                            <View
                              className={`h-6 w-6 items-center justify-center rounded-full border ${
                                selectedByEmployee || selectedByGroup
                                  ? "border-primary bg-primary"
                                  : "border-[#d7deeb] bg-white"
                              }`}
                            >
                              {selectedByEmployee || selectedByGroup ? (
                                <Ionicons
                                  color="#ffffff"
                                  name="checkmark"
                                  size={13}
                                />
                              ) : null}
                            </View>
                            {showAvatar ? (
                              <Image
                                className="h-10 w-10 rounded-full"
                                onError={() => markAvatarFailed(employee.id)}
                                resizeMode="cover"
                                source={employee.avatar}
                              />
                            ) : (
                              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                                <Text className="font-display text-[12px] font-extrabold text-foreground">
                                  {getEmployeeInitials(
                                    employee.firstName,
                                    employee.lastName,
                                  )}
                                </Text>
                              </View>
                            )}
                            <View className="min-w-0 flex-1">
                              <Text
                                className="font-body text-[14px] font-semibold text-foreground"
                                numberOfLines={1}
                              >
                                {buildEmployeeName(
                                  employee.firstName,
                                  employee.lastName,
                                )}
                              </Text>
                              <Text
                                className="mt-1 font-body text-[12px] text-muted-foreground"
                                numberOfLines={1}
                              >
                                {getEmployeeSubtitle(employee)}
                              </Text>
                            </View>
                          </View>
                        </PressableScale>
                      );
                    })
                  ) : (
                    <View className="py-5">
                      <Text className="text-center font-body text-sm text-muted-foreground">
                        {t("manager.meetingNoEmployees")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
          </View>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => {
          setAssignShiftSheetVisible(false);
          setAssignShiftError(null);
        }}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={assignShiftSheetVisible}
      >
        <View
          className="max-h-[78vh] gap-4 px-5 pt-8"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="items-center">
            <Text className="text-center font-display text-[26px] font-extrabold text-foreground">
              {t("calendar.assignShiftTitle")}
            </Text>
            <Text className="mt-2 text-center font-body text-[15px] leading-6 text-muted-foreground">
              {selectedDayLabel}
            </Text>
          </View>

          {assignShiftError ? (
            <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
              <Text className="font-body text-sm leading-6 text-danger">
                {assignShiftError}
              </Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4 pb-3">
              <View className="gap-2">
                <Text className="px-1 font-body text-[12px] font-semibold uppercase tracking-[1.1px] text-[#8a96ab]">
                  {t("calendar.assignShiftEmployee")}
                </Text>
                <View className="overflow-hidden rounded-[24px] border border-[#e7ecf5] bg-white">
                  {visibleManagerEmployees.map((employee, index) => {
                    const isSelected = assignShiftEmployeeId === employee.id;
                    const showAvatar =
                      employee.avatar && !failedAvatarEmployeeIds.has(employee.id);

                    return (
                      <PressableScale
                        className={`px-4 py-3 ${
                          index < visibleManagerEmployees.length - 1
                            ? "border-b border-[#e7ecf5]"
                            : ""
                        }`}
                        haptic="selection"
                        key={employee.id}
                        onPress={() => setAssignShiftEmployeeId(employee.id)}
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`h-6 w-6 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-[#d7deeb] bg-white"
                            }`}
                          >
                            {isSelected ? (
                              <Ionicons color="#ffffff" name="checkmark" size={13} />
                            ) : null}
                          </View>
                          {showAvatar ? (
                            <Image
                              className="h-10 w-10 rounded-full"
                              onError={() => markAvatarFailed(employee.id)}
                              resizeMode="cover"
                              source={employee.avatar}
                            />
                          ) : (
                            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                              <Text className="font-display text-[12px] font-extrabold text-foreground">
                                {getEmployeeInitials(
                                  employee.firstName,
                                  employee.lastName,
                                )}
                              </Text>
                            </View>
                          )}
                          <Text
                            className="min-w-0 flex-1 font-body text-[14px] font-semibold text-foreground"
                            numberOfLines={1}
                          >
                            {buildEmployeeName(
                              employee.firstName,
                              employee.lastName,
                            )}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View className="gap-2">
                <Text className="px-1 font-body text-[12px] font-semibold uppercase tracking-[1.1px] text-[#8a96ab]">
                  {t("calendar.assignShiftTemplate")}
                </Text>
                <View className="overflow-hidden rounded-[24px] border border-[#e7ecf5] bg-white">
                  {shiftTemplates.length ? (
                    shiftTemplates.map((template, index) => {
                      const isSelected = assignShiftTemplateId === template.id;

                      return (
                        <PressableScale
                          className={`px-4 py-3 ${
                            index < shiftTemplates.length - 1
                              ? "border-b border-[#e7ecf5]"
                              : ""
                          }`}
                          haptic="selection"
                          key={template.id}
                          onPress={() => setAssignShiftTemplateId(template.id)}
                        >
                          <View className="flex-row items-center gap-3">
                            <View
                              className={`h-6 w-6 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-[#d7deeb] bg-white"
                              }`}
                            >
                              {isSelected ? (
                                <Ionicons
                                  color="#ffffff"
                                  name="checkmark"
                                  size={13}
                                />
                              ) : null}
                            </View>
                            <View className="flex-1">
                              <Text className="font-body text-[14px] font-semibold text-foreground">
                                {template.name}
                              </Text>
                              <Text className="mt-1 font-body text-[12px] text-muted-foreground">
                                {template.startsAtLocal} - {template.endsAtLocal}
                              </Text>
                            </View>
                          </View>
                        </PressableScale>
                      );
                    })
                  ) : (
                    <View className="px-4 py-5">
                      <Text className="text-center font-body text-sm text-muted-foreground">
                        {t("calendar.noShiftTemplates")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Button
                className="min-h-12 rounded-2xl border-[#dce4f2] bg-white"
                fullWidth
                label={t("profile.cancel")}
                onPress={() => setAssignShiftSheetVisible(false)}
                textClassName="text-foreground"
                variant="secondary"
              />
            </View>
            <View className="flex-1">
              <Button
                className="min-h-12 rounded-2xl"
                disabled={
                  assignShiftSubmitting ||
                  !assignShiftEmployeeId ||
                  !assignShiftTemplateId ||
                  !canAssignShiftForSelectedDay
                }
                fullWidth
                label={
                  assignShiftSubmitting
                    ? t("common.processing")
                    : t("calendar.assignShiftSave")
                }
                onPress={() => {
                  void submitManagerShiftAssignment();
                }}
              />
            </View>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setOverdueSheetVisible(false)}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={overdueSheetVisible}
      >
        <View
          className="max-h-[72vh] gap-4 px-5 pt-8"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <Text className="text-center text-[26px] font-extrabold text-foreground">
            {t("calendar.overdueSheetTitle")}
          </Text>
          <Text className="text-center text-[15px] leading-6 text-muted-foreground">
            {t("calendar.overdueSheetBody")}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-2">
              {overdueTasks.length > 0 ? (
                overdueTasks.map((task) => {
                  const dueAt = parseTaskDueAt(task);
                  const title = getTaskTitle(task, {
                    normalize: true,
                    hideSourceBeforeReady: true,
                  });
                  const subtitle = getTaskBody(task, {
                    hideSourceBeforeReady: true,
                  });
                  const dateLabel = dueAt
                    ? dueAt.toLocaleDateString(locale, {
                        month: "long",
                        day: "numeric",
                      })
                    : t("calendar.noTimeSelected");

                  return (
                    <View
                      key={task.id}
                      className="rounded-[24px] border border-[#e7edf7] bg-white/88 px-4 py-4"
                    >
                      <View className="flex-row items-start gap-3">
                        <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4dd]">
                          <Ionicons
                            color="#f59e0b"
                            name="warning-outline"
                            size={20}
                          />
                        </View>
                        <View className="flex-1">
                          {title ? (
                            <Text className="font-body text-[16px] font-semibold text-foreground">
                              {title}
                            </Text>
                          ) : (
                            <View className="mt-1 h-4 w-[66%] rounded-full bg-[#e2eaf6]" />
                          )}
                          {subtitle ? (
                            <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                              {subtitle}
                            </Text>
                          ) : (
                            <View className="mt-2 h-3 w-[48%] rounded-full bg-[#edf3fb]" />
                          )}
                          <Text className="mt-2 font-body text-xs font-semibold text-[#c17b07]">
                            {t("calendar.overdueFrom", { dateLabel })}
                          </Text>
                        </View>
                      </View>
                      {renderOverdueTaskActions(task, true)}
                    </View>
                  );
                })
              ) : (
                <View className="rounded-[24px] border border-[#e7edf7] bg-white/88 px-4 py-6">
                  <Text className="text-center font-body text-sm text-muted-foreground">
                    {t("calendar.noOverdueTasks")}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => {
          setRescheduleSheetVisible(false);
          setRescheduleDatePickerVisible(false);
          setRescheduleTimePickerVisible(false);
          setRescheduleTaskItem(null);
        }}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={rescheduleSheetVisible}
      >
        <View
          className="gap-4 px-5 pt-8"
          style={{
            paddingBottom: Math.max(
              insets.bottom + 20 - rescheduleActionsOffset,
              4,
            ),
          }}
        >
          <View>
            <Text className="text-center text-[24px] font-extrabold text-foreground">
              {t("calendar.rescheduleTask")}
            </Text>
            <Text className="mt-2 text-center text-[15px] leading-6 text-muted-foreground">
              {t("calendar.rescheduleDescription")}
            </Text>
          </View>

          {rescheduleTaskItem ? (
            <View className="items-center px-2">
              {(() => {
                const title = getTaskTitle(rescheduleTaskItem, {
                  normalize: true,
                  hideSourceBeforeReady: true,
                });

                return title ? (
                  <Text className="text-center font-body text-[16px] font-semibold text-foreground">
                    {title}
                  </Text>
                ) : (
                  <View className="mt-1 h-4 w-[62%] rounded-full bg-[#e2eaf6]" />
                );
              })()}
              <Text className="mt-1 text-center font-body text-sm leading-6 text-muted-foreground">
                {t("calendar.moveToAnotherDayHint")}
              </Text>
            </View>
          ) : null}

          <View className="gap-3">
            <View className="items-center">
              <Text className="font-body text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">
                {t("calendar.date")}
              </Text>
              {Platform.OS === "ios" ? (
                <View className="mt-2 self-stretch">
                  <DateTimePicker
                    display="spinner"
                    minimumDate={todayStart}
                    mode="date"
                    onChange={handleRescheduleDateChange}
                    textColor="#000000"
                    value={rescheduleDateValue}
                  />
                </View>
              ) : (
                <PressableScale
                  className="mt-2 min-w-[220px] rounded-[20px] border border-[#dce4f2] bg-[#f8fbff] px-5 py-4"
                  haptic="selection"
                  onPress={() => setRescheduleDatePickerVisible(true)}
                >
                  <Text className="text-center font-body text-[15px] font-semibold text-foreground">
                    {rescheduleDateValue.toLocaleDateString(locale, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </PressableScale>
              )}
            </View>

            <View className="items-center">
              <Text className="font-body text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">
                {t("calendar.time")}
              </Text>
              <PressableScale
                className="mt-2 min-w-[220px] rounded-[20px] border border-[#dce4f2] bg-[#f8fbff] px-5 py-4"
                haptic="selection"
                onPress={() => setRescheduleTimePickerVisible(true)}
              >
                <Text className="text-center font-body text-[15px] font-semibold text-foreground">
                  {combineDateAndTime(
                    rescheduleDateValue,
                    rescheduleTimeValue,
                  ).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </PressableScale>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Button
                className="min-h-12 rounded-2xl border-[#fecdd3] bg-[#fff1f2]"
                fullWidth
                label={t("profile.cancel")}
                onPress={() => {
                  setRescheduleSheetVisible(false);
                  setRescheduleDatePickerVisible(false);
                  setRescheduleTimePickerVisible(false);
                  setRescheduleTaskItem(null);
                }}
                textClassName="text-[#dc2626]"
                variant="secondary"
              />
            </View>
            <View className="flex-1">
              <Button
                className="min-h-12 rounded-2xl border-[#dce4f2] bg-white"
                fullWidth
                label={
                  pendingTaskAction === "reschedule"
                    ? t("common.processing")
                    : t("calendar.saveNewDate")
                }
                onPress={() => {
                  void submitTaskReschedule();
                }}
                textClassName="text-foreground"
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </BottomSheetModal>

      {Platform.OS === "android" && rescheduleDatePickerVisible ? (
        <DateTimePicker
          minimumDate={todayStart}
          mode="date"
          onChange={handleRescheduleDateChange}
          value={rescheduleDateValue}
        />
      ) : null}

      <TimeWheelPicker
        initialValue={rescheduleTimeValue}
        onApply={(value) => {
          setRescheduleTimeValue(value);
          setRescheduleTimePickerVisible(false);
        }}
        onClose={() => setRescheduleTimePickerVisible(false)}
        title={t("calendar.time")}
        visible={rescheduleTimePickerVisible}
      />
    </>
  );
}
