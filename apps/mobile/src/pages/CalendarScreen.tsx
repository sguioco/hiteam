import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "../../components/ui/text";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  AnnouncementItem,
  ManagerEmployeeItem,
  ManagerScheduleShiftItem,
  ManagerShiftTemplateItem,
  TaskItem,
  WorkGroupItem,
} from "@smart/types";
import BottomSheetModal from "../components/BottomSheetModal";
import {
  BOTTOM_SHEET_ACTION_BUTTON_CLASS,
  BOTTOM_SHEET_ACTION_ROW_CLASS,
  BOTTOM_SHEET_ACTION_TEXT_CLASS,
  getBottomSheetActionBottomOffset,
} from "../components/bottom-sheet-actions";
import {
  TimeWheelPicker,
  type TimeValue,
} from "../components/TimeWheelPicker";
import { hasManagerAccess, useAuthFlowState } from "../../lib/auth-flow";
import {
  createManagerShiftTemplate,
  createManagerShift,
  cancelManagerShift,
  loadEmployeesBootstrap,
  loadManagerScheduleBootstrap,
  loadManagerTasksBootstrap,
  loadMyAnnouncements,
  rescheduleMyTask,
  updateManagerShift,
  updateMyTaskStatus,
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
import { resolveEmployeeAvatarSource } from "../../lib/employee-avatar";
import {
  isTaskMeeting,
  isTaskOpen,
  parseTaskDueAt,
} from "../../lib/task-utils";
import {
  primeTaskTranslations,
  useTranslatedTaskCopy,
} from "../../lib/use-translated-task-copy";
import { useWorkspaceRealtimeRefresh } from "../../lib/use-workspace-realtime-refresh";
import { PressableScale } from "../../components/ui/pressable-scale";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  getCalendarScreenCacheKey,
  getNewsScreenCacheKey,
  NEWS_SCREEN_CACHE_TTL_MS,
  warmAnnouncementImages,
} from "../../lib/workspace-cache";

type CalendarDayItem = {
  authorName: string;
  id: string;
  task: TaskItem;
  title: string;
  kind: "task" | "meeting";
  note: string;
  status: "done" | "planned" | "cancelled" | "overdue";
};

type TaskPhoto = {
  id: string;
  label: string;
  capturedAt: string;
  uri: string;
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

type ManagerTaskSearchResult = {
  task: TaskItem;
  date: Date;
  dayNumber: number;
  monthLabel: string;
  title: string;
  employee?: ManagerEmployee;
  employeeName: string;
  firstName: string;
  lastName: string;
  photoCount: number;
  visuallyDone: boolean;
  isOverdue: boolean;
};

type ManagerCalendarTab = "all" | "overdue" | "pending" | "done";

type ManagerOverdueEmployeeRow = {
  avatarSource: ManagerEmployee["avatar"] | null;
  employee: ManagerEmployee | null;
  employeeName: string;
  firstName: string;
  groupTitle: string;
  id: string;
  lastName: string;
  tasks: Array<{
    dateLabel: string;
    dueAt: Date | null;
    photoCount: number;
    subtitle: string;
    task: TaskItem;
    title: string;
  }>;
};

type CalendarScreenCacheValue = {
  organizationStartDate?: string | null;
  shifts: CalendarShift[];
  tasks: TaskItem[];
  managerEmployees?: ManagerEmployee[];
  managerGroups?: ManagerGroup[];
  managerShifts?: ManagerScheduleShift[];
  shiftTemplates?: ManagerShiftTemplate[];
};

type ShiftTemplateDraft = {
  name: string;
  startsAt: TimeValue;
  endsAt: TimeValue;
  weekDays: number[];
  fixedBreakEnabled: boolean;
  fixedBreakStartsAt: TimeValue;
  fixedBreakDurationMinutes: string;
};

const CALENDAR_SCREEN_CACHE_TTL_MS = 5 * 60_000;

const styles = StyleSheet.create({
  rescheduleDatePickerSpinner: {
    alignSelf: "center",
  },
});

function createDefaultShiftTemplateDraft(): ShiftTemplateDraft {
  return {
    name: "",
    startsAt: { hour: 9, minute: 0 },
    endsAt: { hour: 18, minute: 0 },
    weekDays: [1, 2, 3, 4, 5],
    fixedBreakEnabled: false,
    fixedBreakStartsAt: { hour: 13, minute: 0 },
    fixedBreakDurationMinutes: "30",
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseOrganizationStartDate(value?: string | Date | null) {
  const parsed = value instanceof Date ? value : value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function combineDateAndTime(date: Date, time: TimeValue) {
  const next = new Date(date);
  next.setHours(time.hour, time.minute, 0, 0);
  return next;
}

function formatLocalTime(value: TimeValue) {
  return `${`${value.hour}`.padStart(2, "0")}:${`${value.minute}`.padStart(2, "0")}`;
}

function durationStringToTimeValue(value: string): TimeValue {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, Number(value) || 0));

  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

function timeValueToDurationMinutes(value: TimeValue) {
  return String(value.hour * 60 + value.minute);
}

function formatBreakDurationLabel(value: string, language: string) {
  const minutes = Math.max(0, Number(value) || 0);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = language === "ru" ? "ч" : "h";
  const minuteLabel = language === "ru" ? "мин" : "min";

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`;
  }

  if (hours > 0) {
    return `${hours} ${hourLabel}`;
  }

  return `${remainingMinutes} ${minuteLabel}`;
}

function parseLocalTime(value?: string | null): TimeValue | null {
  const match = value?.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

const CYRILLIC_TEMPLATE_CODE_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function buildClientTemplateCode(value: string) {
  const normalized = Array.from(value)
    .map((char) => CYRILLIC_TEMPLATE_CODE_MAP[char.toLowerCase()] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .toUpperCase();
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const base = normalized || "SHIFT";

  return `${base.slice(0, Math.max(1, 23 - suffix.length))}-${suffix}`;
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
  const assigneeAvatarUrl = task.assigneeEmployee.avatarUrl ?? null;

  return {
    id: task.assigneeEmployee.id,
    firstName: task.assigneeEmployee.firstName,
    lastName: task.assigneeEmployee.lastName,
    email: "",
    employeeNumber: task.assigneeEmployee.employeeNumber,
    department: task.assigneeEmployee.department ?? null,
    position: null,
    primaryLocation: task.assigneeEmployee.primaryLocation ?? null,
    avatar: resolveEmployeeAvatarSource({
      avatarUrl: assigneeAvatarUrl,
      employeeNumber: task.assigneeEmployee.employeeNumber,
      firstName: task.assigneeEmployee.firstName,
      id: task.assigneeEmployee.id,
      lastName: task.assigneeEmployee.lastName,
    }),
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

function getManagerShiftGroupId(shift?: ManagerScheduleShift | null) {
  return shift
    ? `${shift.template.id}:${shift.startsAt}:${shift.endsAt}`
    : "without-shift";
}

function normalizeManagerShiftCandidate(
  shift: unknown,
): ManagerScheduleShift | null {
  const candidate = shift as Partial<ManagerScheduleShift> | null;

  if (
    !candidate?.id ||
    !candidate.shiftDate ||
    !candidate.employeeId ||
    !candidate.employee?.id ||
    !candidate.template?.id
  ) {
    return null;
  }

  return candidate as ManagerScheduleShift;
}

function normalizeManagerScheduleShifts(
  shifts: unknown[] | undefined,
): ManagerScheduleShift[] {
  return (shifts ?? [])
    .map(normalizeManagerShiftCandidate)
    .filter((shift): shift is ManagerScheduleShift => shift !== null);
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

function buildTaskPhotos(task: TaskItem, locale: string): TaskPhoto[] {
  const photoLabelPrefix = locale.startsWith("ru") ? "Фото" : "Photo";

  return task.photoProofs
    .filter(
      (proof) => !proof.deletedAt && !proof.supersededByProofId && proof.url,
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
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

export default function CalendarScreen({
  active = true,
  overdueSheetSignal = 0,
}: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetActionBottomOffset = getBottomSheetActionBottomOffset(insets.bottom);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const overdueSheetMaxHeight = Math.min(
    viewportHeight - insets.top - 12,
    viewportHeight * 0.76,
  );
  const rescheduleDatePickerWidth = Math.min(viewportWidth - 40, 430);
  const overdueListBottomPadding = Math.max(insets.bottom + 28, 54);
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
  const [organizationStartDate, setOrganizationStartDate] =
    useState<Date | null>(null);
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
  const calendarCacheKey = getCalendarScreenCacheKey(currentDate, isManager);
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
  const [refreshing, setRefreshing] = useState(false);
  const [manualRefreshSignal, setManualRefreshSignal] = useState(0);
  const handledManualRefreshSignalRef = useRef(0);
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
  const [managerTaskSearch, setManagerTaskSearch] = useState("");
  const [managerCalendarTab, setManagerCalendarTab] =
    useState<ManagerCalendarTab>("all");
  const [expandedManagerEmployeeId, setExpandedManagerEmployeeId] = useState<
    string | null
  >(null);
  const [expandedManagerShiftGroupIds, setExpandedManagerShiftGroupIds] =
    useState<string[]>([]);
  const managerShiftGroupKeyRef = useRef("");
  const [expandedManagerGroupIds, setExpandedManagerGroupIds] = useState<
    string[]
  >([]);
  const [failedAvatarEmployeeIds, setFailedAvatarEmployeeIds] = useState<
    Set<string>
  >(() => new Set());
  const [assignShiftSheetVisible, setAssignShiftSheetVisible] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [assignShiftEmployeeIds, setAssignShiftEmployeeIds] = useState<
    string[]
  >([]);
  const [assignShiftTemplateId, setAssignShiftTemplateId] = useState("");
  const [assignShiftBreakEnabled, setAssignShiftBreakEnabled] = useState(false);
  const [assignShiftBreakStartsAt, setAssignShiftBreakStartsAt] =
    useState<TimeValue>(() => ({ hour: 13, minute: 0 }));
  const [
    assignShiftBreakDurationMinutes,
    setAssignShiftBreakDurationMinutes,
  ] = useState("30");
  const [assignShiftBreakPickerVisible, setAssignShiftBreakPickerVisible] =
    useState(false);
  const [
    assignShiftBreakDurationPickerVisible,
    setAssignShiftBreakDurationPickerVisible,
  ] = useState(false);
  const [assignShiftSubmitting, setAssignShiftSubmitting] = useState(false);
  const [shiftActionId, setShiftActionId] = useState<string | null>(null);
  const [assignShiftError, setAssignShiftError] = useState<string | null>(null);
  const [templateComposerVisible, setTemplateComposerVisible] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<ShiftTemplateDraft>(() =>
    createDefaultShiftTemplateDraft(),
  );
  const [templateTimePickerTarget, setTemplateTimePickerTarget] = useState<
    "start" | "end" | "break" | null
  >(null);
  const [
    templateBreakDurationPickerVisible,
    setTemplateBreakDurationPickerVisible,
  ] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(
    initialNewsSnapshot?.value ?? [],
  );
  const [activePhotoTaskId, setActivePhotoTaskId] = useState<string | null>(
    null,
  );
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [failedPhotoIds, setFailedPhotoIds] = useState<string[]>([]);
  const { getTaskBody, getTaskMeetingLocation, getTaskTitle } =
    useTranslatedTaskCopy(tasks, language);
  const isCurrentMonth =
    year === today.getFullYear() && monthIndex === today.getMonth();
  const selectedDate = new Date(year, monthIndex, selectedDay);
  const selectedDayKey = formatDateKey(selectedDate);
  const todayStart = useMemo(() => startOfDay(today), [today]);
  const organizationStartMonth = organizationStartDate
    ? startOfMonth(organizationStartDate)
    : null;
  const canGoToPreviousMonth =
    !organizationStartMonth ||
    startOfMonth(currentDate).getTime() > organizationStartMonth.getTime();

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
      setOrganizationStartDate(
        parseOrganizationStartDate(entry.value.organizationStartDate),
      );
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
    const isManualRefresh =
      manualRefreshSignal !== handledManualRefreshSignalRef.current;

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
        setOrganizationStartDate(
          parseOrganizationStartDate(cached.value.organizationStartDate),
        );
        setLoading(false);
      } else if (!initialSnapshot) {
        setLoading(true);
      }

      if (cached && !cancelled) {
        const cachedHasRequiredManagerAssignmentData =
          !isManager ||
          ((cached.value.managerEmployees?.length ?? 0) > 0 &&
            (cached.value.shiftTemplates?.length ?? 0) > 0);
        const cachedHasOrganizationStartDate = Boolean(
          cached.value.organizationStartDate,
        );

        if (
          !isManualRefresh &&
          !cached.isStale &&
          cachedHasRequiredManagerAssignmentData &&
          cachedHasOrganizationStartDate
        ) {
          return;
        }
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
        let nextOrganizationStartDate: Date | null = null;
        let partialLoadError: string | null = null;

        try {
          const scheduleSnapshot = await loadManagerScheduleBootstrap(rangeQuery);
          const scheduleData = scheduleSnapshot.initialData;

          if (!scheduleData) {
            throw new Error(t("today.loadError"));
          }

          nextOrganizationStartDate = parseOrganizationStartDate(
            scheduleData.organizationSetup?.company?.createdAt,
          );

          if (nextOrganizationStartDate && !cancelled) {
            setOrganizationStartDate(nextOrganizationStartDate);
          }

          const taskBoard = scheduleData.taskBoard ?? null;
          let taskFallbackEmployees: ManagerEmployee[] = [];
          let taskFallbackGroups: ManagerGroup[] = [];

          if (taskBoard) {
            nextTasks = taskBoard.tasks;
          } else if (isManager) {
            const taskSnapshot = await loadManagerTasksBootstrap(
              rangeQuery,
            ).catch(() => null);

            if (taskSnapshot) {
              nextTasks = taskSnapshot.tasks;
              taskFallbackEmployees = taskSnapshot.employees;
              taskFallbackGroups = taskSnapshot.groups ?? [];
            } else {
              nextTasks = cached?.value.tasks ?? [];
            }
          } else {
            nextTasks = cached?.value.tasks ?? [];
          }

          if (isManager) {
            nextManagerEmployees = scheduleData.employees.length
              ? scheduleData.employees
              : taskFallbackEmployees;
            nextManagerGroups = scheduleData.groups?.length
              ? scheduleData.groups
              : taskFallbackGroups;
            nextManagerShifts = scheduleData.shifts;
            nextShiftTemplates = scheduleData.templates;

            if (
              nextManagerEmployees.length === 0 ||
              nextManagerGroups.length === 0 ||
              nextShiftTemplates.length === 0
            ) {
              const employeesSnapshot = await loadEmployeesBootstrap().catch(
                () => null,
              );

              if (employeesSnapshot) {
                nextManagerEmployees = employeesSnapshot.employeeRecords.length
                  ? employeesSnapshot.employeeRecords
                  : nextManagerEmployees;
                nextManagerGroups = employeesSnapshot.groups.length
                  ? employeesSnapshot.groups
                  : nextManagerGroups;
                nextManagerShifts = nextManagerShifts.length
                  ? nextManagerShifts
                  : normalizeManagerScheduleShifts(
                      employeesSnapshot.scheduleShifts,
                    );
                nextShiftTemplates = nextShiftTemplates.length
                  ? nextShiftTemplates
                  : employeesSnapshot.scheduleTemplates;
              }
            }
          } else {
            nextShifts = scheduleData.shifts;
          }
        } catch (scheduleError) {
          if (!isManager) {
            throw scheduleError;
          }

          const [tasksResult, employeesResult] = await Promise.allSettled([
            loadManagerTasksBootstrap(rangeQuery),
            loadEmployeesBootstrap(),
          ]);

          if (
            tasksResult.status === "rejected" &&
            employeesResult.status === "rejected"
          ) {
            throw scheduleError;
          }

          if (tasksResult.status === "fulfilled") {
            nextTasks = tasksResult.value.tasks;
            nextManagerEmployees = tasksResult.value.employees;
            nextManagerGroups = tasksResult.value.groups ?? [];
          } else {
            nextTasks = cached?.value.tasks ?? [];
          }

          if (employeesResult.status === "fulfilled") {
            nextOrganizationStartDate = parseOrganizationStartDate(
              employeesResult.value.organizationSetup?.company?.createdAt,
            );

            if (nextOrganizationStartDate && !cancelled) {
              setOrganizationStartDate(nextOrganizationStartDate);
            }

            nextManagerEmployees = employeesResult.value.employeeRecords.length
              ? employeesResult.value.employeeRecords
              : nextManagerEmployees;
            nextManagerGroups = employeesResult.value.groups.length
              ? employeesResult.value.groups
              : nextManagerGroups;
            nextManagerShifts = normalizeManagerScheduleShifts(
              employeesResult.value.scheduleShifts,
            );
            nextShiftTemplates = employeesResult.value.scheduleTemplates;
          }

          partialLoadError = null;
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
            organizationStartDate:
              nextOrganizationStartDate?.toISOString() ?? null,
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
          setRefreshing(false);
          handledManualRefreshSignalRef.current = manualRefreshSignal;
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    calendarCacheKey,
    initialSnapshot,
    isManager,
    language,
    manualRefreshSignal,
    monthIndex,
    t,
    year,
  ]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  useWorkspaceRealtimeRefresh({
    enabled: active,
    onRefresh: () => {
      setManualRefreshSignal((current) => current + 1);
    },
  });

  useEffect(() => {
    if (!organizationStartDate) {
      return;
    }

    const currentMonthStart = startOfMonth(currentDate);
    const organizationMonthStart = startOfMonth(organizationStartDate);

    if (currentMonthStart.getTime() < organizationMonthStart.getTime()) {
      setMonthAnimationDirection("next");
      setCurrentDate(organizationMonthStart);
      setSelectedDay(organizationStartDate.getDate());
      return;
    }

    if (
      currentMonthStart.getTime() === organizationMonthStart.getTime() &&
      selectedDay < organizationStartDate.getDate()
    ) {
      setSelectedDay(organizationStartDate.getDate());
    }
  }, [currentDate, organizationStartDate, selectedDay]);

  useEffect(() => {
    if (overdueSheetSignal > 0) {
      if (isManager) {
        setManagerCalendarTab("overdue");
        setOverdueSheetVisible(false);
      } else {
        setOverdueSheetVisible(true);
      }
    }
  }, [isManager, overdueSheetSignal]);

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
      if (task.status === "CANCELLED") {
        return;
      }

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
      const authorName = task.managerEmployee
        ? buildEmployeeName(
            task.managerEmployee.firstName,
            task.managerEmployee.lastName,
          )
        : "";
      nextItems.push({
        authorName,
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
      .filter(
        (task) =>
          task.status !== "CANCELLED" &&
          isOverdueTask(task, today) &&
          buildTaskPhotos(task, locale).length === 0,
      )
      .sort((left, right) => {
        const leftDueAt = parseTaskDueAt(left)?.getTime() ?? Infinity;
        const rightDueAt = parseTaskDueAt(right)?.getTime() ?? Infinity;
        return leftDueAt - rightDueAt;
      });
  }, [locale, tasks, today]);
  const activePhotoTask = useMemo(
    () => tasks.find((task) => task.id === activePhotoTaskId) ?? null,
    [activePhotoTaskId, tasks],
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
  const selectedPhotoFailed = selectedPhoto
    ? failedPhotoIds.includes(selectedPhoto.id)
    : false;
  const photoViewerPreviewHeight = Math.max(
    190,
    Math.min(viewportWidth - 40, viewportHeight * 0.42, 360),
  );

  function markPhotoLoadFailed(photoId: string) {
    setFailedPhotoIds((current) =>
      current.includes(photoId) ? current : [...current, photoId],
    );
  }

  function clearPhotoLoadFailed(photoId: string) {
    setFailedPhotoIds((current) => current.filter((id) => id !== photoId));
  }

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
          avatar: resolveEmployeeAvatarSource({
            avatarUrl: membership.employee.avatarUrl ?? null,
            employeeNumber: membership.employee.employeeNumber,
            firstName: membership.employee.firstName,
            id: membership.employee.id,
            lastName: membership.employee.lastName,
          }),
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
        avatar: resolveEmployeeAvatarSource({
          avatarUrl: shift.employee.avatarUrl ?? null,
          employeeNumber: shift.employee.employeeNumber,
          firstName: shift.employee.firstName,
          id: shift.employee.id,
          lastName: shift.employee.lastName,
        }),
      });
    });

    return map;
  }, [managerEmployees, managerGroups, managerShifts, tasks]);

  const overdueTaskGroups = useMemo(() => {
    const groupByEmployeeId = new Map<
      string,
      { id: string; name: string }
    >();

    managerGroups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (!groupByEmployeeId.has(membership.employeeId)) {
          groupByEmployeeId.set(membership.employeeId, {
            id: group.id,
            name: group.name,
          });
        }
      });
    });

    const groups = new Map<
      string,
      {
        id: string;
        title: string;
        tasks: Array<{
          avatarSource: ManagerEmployee["avatar"] | null;
          dateLabel: string;
          dueAt: Date | null;
          employeeId: string | null;
          employeeName: string;
          firstName: string;
          lastName: string;
          photoCount: number;
          subtitle: string;
          task: TaskItem;
          title: string;
        }>;
      }
    >();

    overdueTasks.forEach((task) => {
      const employeeId = getTaskAssigneeId(task);
      const employee =
        (employeeId ? managerEmployeeDirectory.get(employeeId) : null) ??
        buildManagerEmployeeFromTask(task);
      const explicitGroup = task.group
        ? { id: task.group.id, name: task.group.name }
        : null;
      const membershipGroup = employeeId
        ? groupByEmployeeId.get(employeeId) ?? null
        : null;
      const group = explicitGroup ?? membershipGroup;
      const groupId = group?.id ?? "without-group";
      const groupTitle = group?.name ?? t("calendar.withoutGroup");
      const firstName = employee?.firstName ?? task.assigneeEmployee?.firstName ?? "";
      const lastName = employee?.lastName ?? task.assigneeEmployee?.lastName ?? "";
      const employeeName =
        buildEmployeeName(firstName, lastName) ||
        employee?.employeeNumber ||
        task.group?.name ||
        t("calendar.groupTask");
      const dueAt = parseTaskDueAt(task);
      const dateLabel = dueAt
        ? dueAt.toLocaleDateString(locale, {
            month: "long",
            day: "numeric",
          })
        : t("calendar.noTimeSelected");
      const title =
        getTaskTitle(task, {
          normalize: true,
          hideSourceBeforeReady: true,
        }) || task.title;
      const subtitle = getTaskBody(task, {
        hideSourceBeforeReady: true,
      });
      const groupRecord = groups.get(groupId) ?? {
        id: groupId,
        title: groupTitle,
        tasks: [],
      };

      groupRecord.tasks.push({
        avatarSource: employee?.avatar ?? null,
        dateLabel,
        dueAt,
        employeeId,
        employeeName,
        firstName,
        lastName,
        photoCount: buildTaskPhotos(task, locale).length,
        subtitle,
        task,
        title,
      });
      groups.set(groupId, groupRecord);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        tasks: group.tasks.sort((left, right) => {
          const leftTime = left.dueAt?.getTime() ?? Infinity;
          const rightTime = right.dueAt?.getTime() ?? Infinity;
          return leftTime - rightTime || left.title.localeCompare(right.title, locale);
        }),
      }))
      .sort((left, right) => {
        if (left.id === "without-group") return 1;
        if (right.id === "without-group") return -1;
        return left.title.localeCompare(right.title, locale);
      });
  }, [
    getTaskBody,
    getTaskTitle,
    locale,
    managerEmployeeDirectory,
    managerGroups,
    overdueTasks,
    t,
  ]);

  const overdueEmployeeRows = useMemo<ManagerOverdueEmployeeRow[]>(() => {
    const groupByEmployeeId = new Map<
      string,
      { id: string; name: string }
    >();

    managerGroups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (!groupByEmployeeId.has(membership.employeeId)) {
          groupByEmployeeId.set(membership.employeeId, {
            id: group.id,
            name: group.name,
          });
        }
      });
    });

    const rows = new Map<string, ManagerOverdueEmployeeRow>();

    overdueTasks.forEach((task) => {
      const employeeId = getTaskAssigneeId(task);
      const employee =
        (employeeId ? managerEmployeeDirectory.get(employeeId) : null) ??
        buildManagerEmployeeFromTask(task);
      const explicitGroup = task.group
        ? { id: task.group.id, name: task.group.name }
        : null;
      const membershipGroup = employeeId
        ? groupByEmployeeId.get(employeeId) ?? null
        : null;
      const group = membershipGroup ?? explicitGroup;
      const firstName = employee?.firstName ?? task.assigneeEmployee?.firstName ?? "";
      const lastName = employee?.lastName ?? task.assigneeEmployee?.lastName ?? "";
      const employeeName =
        buildEmployeeName(firstName, lastName) ||
        employee?.employeeNumber ||
        task.group?.name ||
        t("calendar.groupTask");
      const rowId = employeeId
        ? `employee:${employeeId}`
        : task.group?.id
          ? `group:${task.group.id}`
          : "without-assignee";
      const dueAt = parseTaskDueAt(task);
      const dateLabel = dueAt
        ? dueAt.toLocaleDateString(locale, {
            month: "long",
            day: "numeric",
          })
        : t("calendar.noTimeSelected");
      const title =
        getTaskTitle(task, {
          normalize: true,
          hideSourceBeforeReady: true,
        }) || task.title;
      const subtitle = getTaskBody(task, {
        hideSourceBeforeReady: true,
      });
      const row = rows.get(rowId) ?? {
        avatarSource: employee?.avatar ?? null,
        employee: employee ?? null,
        employeeName,
        firstName,
        groupTitle: group?.name ?? t("calendar.withoutGroup"),
        id: rowId,
        lastName,
        tasks: [],
      };

      row.tasks.push({
        dateLabel,
        dueAt,
        photoCount: buildTaskPhotos(task, locale).length,
        subtitle,
        task,
        title,
      });
      rows.set(rowId, row);
    });

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        tasks: row.tasks.sort((left, right) => {
          const leftTime = left.dueAt?.getTime() ?? Infinity;
          const rightTime = right.dueAt?.getTime() ?? Infinity;
          return leftTime - rightTime || left.title.localeCompare(right.title, locale);
        }),
      }))
      .sort((left, right) => {
        if (left.id === "without-assignee") return 1;
        if (right.id === "without-assignee") return -1;
        if (left.tasks.length !== right.tasks.length) {
          return right.tasks.length - left.tasks.length;
        }
        return left.employeeName.localeCompare(right.employeeName, locale);
      });
  }, [
    getTaskBody,
    getTaskTitle,
    locale,
    managerEmployeeDirectory,
    managerGroups,
    overdueTasks,
    t,
  ]);

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
  const assignShiftEmployeeOptions = sortedManagerEmployees;

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
      return (
        shift.status !== "CANCELLED" &&
        !Number.isNaN(date.getTime()) &&
        formatDateKey(date) === selectedDayKey
      );
    });
  }, [managerShifts, selectedDayKey]);

  const managerTaskSearchQuery = useMemo(
    () => managerTaskSearch.trim().toLocaleLowerCase(locale),
    [locale, managerTaskSearch],
  );
  const isManagerTaskSearchActive = managerTaskSearchQuery.length > 0;

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

  const managerTaskSearchResults = useMemo<ManagerTaskSearchResult[]>(() => {
    if (!managerTaskSearchQuery) {
      return [];
    }

    const results: ManagerTaskSearchResult[] = [];

    tasks.forEach((task) => {
      if (task.status === "CANCELLED") {
        return;
      }

      const date = getTaskCalendarDate(task);
      if (!date) {
        return;
      }

      const employeeId = getTaskAssigneeId(task);
      if (!employeeId || !activeManagerEmployeeIdSet.has(employeeId)) {
        return;
      }

      const directoryEmployee = managerEmployeeDirectory.get(employeeId);
      const firstName =
        directoryEmployee?.firstName ?? task.assigneeEmployee?.firstName ?? "";
      const lastName =
        directoryEmployee?.lastName ?? task.assigneeEmployee?.lastName ?? "";
      const employeeNumber =
        directoryEmployee?.employeeNumber ??
        task.assigneeEmployee?.employeeNumber ??
        "";
      const employeeName = buildEmployeeName(firstName, lastName);
      const title = getTaskTitle(task, {
        normalize: true,
        hideSourceBeforeReady: true,
      });
      const body = getTaskBody(task, { hideSourceBeforeReady: true });
      const searchSource = [
        title,
        task.title,
        body,
        employeeName,
        employeeNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(locale);

      if (!searchSource.includes(managerTaskSearchQuery)) {
        return;
      }

      const photoCount = buildTaskPhotos(task, locale).length;
      const visuallyDone = task.status === "DONE" || photoCount > 0;

      results.push({
        task,
        date,
        dayNumber: date.getDate(),
        monthLabel: date.toLocaleString(locale, { month: "short" }),
        title: title || task.title,
        employee: directoryEmployee,
        employeeName,
        firstName,
        lastName,
        photoCount,
        visuallyDone,
        isOverdue: !visuallyDone && isOverdueTask(task, today),
      });
    });

    return results.sort((left, right) => {
      const dateOrder = left.date.getTime() - right.date.getTime();
      if (dateOrder !== 0) {
        return dateOrder;
      }

      return left.title.localeCompare(right.title, locale);
    });
  }, [
    activeManagerEmployeeIdSet,
    getTaskBody,
    getTaskTitle,
    locale,
    managerEmployeeDirectory,
    managerTaskSearchQuery,
    tasks,
    today,
  ]);

  const managerEmployeeRows = useMemo(() => {
    return visibleManagerEmployees
      .map((employee) => {
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
      })
      .sort((left, right) => {
        const leftShift = left.shift
          ? `${left.shift.startsAt}:${left.shift.endsAt}:${left.shift.template.name}`
          : "zz-without-shift";
        const rightShift = right.shift
          ? `${right.shift.startsAt}:${right.shift.endsAt}:${right.shift.template.name}`
          : "zz-without-shift";
        const shiftOrder = leftShift.localeCompare(rightShift, locale);

        if (shiftOrder !== 0) {
          return shiftOrder;
        }

        return right.plannedTasks.length - left.plannedTasks.length;
      });
  }, [
    locale,
    managerShiftByEmployeeId,
    managerTasksForSelectedDay,
    visibleManagerEmployees,
  ]);

  const managerCalendarTabStats = useMemo(() => {
    return managerEmployeeRows.reduce(
      (stats, row) => {
        const openTasks = row.plannedTasks.filter((task) =>
          isTaskOpen(task.status),
        );
        const pendingOpenTasks = openTasks.filter(
          (task) => !isOverdueTask(task, today),
        );

        stats.all += 1;
        stats.pending +=
          pendingOpenTasks.length > 0
            ? pendingOpenTasks.length
            : row.shift
              ? 1
              : 0;
        stats.done += row.doneTasks.length;

        return stats;
      },
      { all: 0, overdue: overdueTasks.length, pending: 0, done: 0 },
    );
  }, [managerEmployeeRows, overdueTasks.length, today]);

  const filteredManagerEmployeeRows = useMemo(() => {
    if (managerCalendarTab === "all") {
      return managerEmployeeRows;
    }

    return managerEmployeeRows.filter((row) => {
      if (managerCalendarTab === "overdue") {
        return false;
      }

      const openTasks = row.plannedTasks.filter((task) =>
        isTaskOpen(task.status),
      );
      const overdueTasks = openTasks.filter((task) =>
        isOverdueTask(task, today),
      );
      const pendingTasksCount = openTasks.length - overdueTasks.length;

      if (managerCalendarTab === "pending") {
        return pendingTasksCount > 0 || Boolean(row.shift);
      }

      return row.doneTasks.length > 0;
    });
  }, [managerCalendarTab, managerEmployeeRows, today]);

  const managerCalendarTabs = useMemo(
    () =>
      [
        {
          key: "all",
          label: t("calendar.tabAll"),
          count: null,
          tone: "neutral",
        },
        {
          key: "overdue",
          label: t("calendar.tabOverdue"),
          count: managerCalendarTabStats.overdue,
          tone: "warning",
        },
        {
          key: "pending",
          label: t("calendar.tabPending"),
          count: managerCalendarTabStats.pending,
          tone: "info",
        },
        {
          key: "done",
          label: t("calendar.tabDone"),
          count: managerCalendarTabStats.done,
          tone: "success",
        },
      ] satisfies Array<{
        key: ManagerCalendarTab;
        label: string;
        count: number | null;
        tone: "neutral" | "warning" | "info" | "success";
      }>,
    [managerCalendarTabStats, t],
  );

  const managerShiftGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        title: string;
        subtitle: string;
        rows: typeof managerEmployeeRows;
      }
    >();

    filteredManagerEmployeeRows.forEach((row) => {
      const groupId = getManagerShiftGroupId(row.shift);
      const title = row.shift
        ? row.shift.template.name
        : t("calendar.withoutShift");
      const subtitle = row.shift
        ? formatShiftRange(row.shift, locale)
        : t("calendar.noShiftAssigned");
      const group = groups.get(groupId) ?? {
        id: groupId,
        title,
        subtitle,
        rows: [],
      };

      group.rows.push(row);
      groups.set(groupId, group);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.id === "without-shift") return 1;
      if (right.id === "without-shift") return -1;
      return left.subtitle.localeCompare(right.subtitle, locale);
    });
  }, [filteredManagerEmployeeRows, locale, t]);

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
      employeesOnShift: managerEmployeeRows.filter((row) => row.shift).length,
      employeesWithOpenTasks,
    };
  }, [managerEmployeeRows]);

  const topOverdueEmployeeRows = useMemo(
    () =>
      overdueEmployeeRows.slice(
        0,
        managerDaySummary.employeesOnShift >= 10 ? 5 : 3,
      ),
    [managerDaySummary.employeesOnShift, overdueEmployeeRows],
  );

  const managerDoneTodayRows = useMemo(() => {
    return managerEmployeeRows
      .filter(
        (row) =>
          row.plannedTasks.length > 0 &&
          row.doneTasks.length === row.plannedTasks.length,
      )
      .sort((left, right) => {
        if (left.doneTasks.length !== right.doneTasks.length) {
          return right.doneTasks.length - left.doneTasks.length;
        }

        return buildEmployeeName(
          left.employee.firstName,
          left.employee.lastName,
        ).localeCompare(
          buildEmployeeName(right.employee.firstName, right.employee.lastName),
          locale,
        );
      });
  }, [locale, managerEmployeeRows]);

  const managerDoneEmployeeRows = useMemo(() => {
    const limit = managerDaySummary.employeesOnShift >= 10 ? 5 : 3;
    const result = [...managerDoneTodayRows];

    if (result.length >= limit) {
      return result;
    }

    const supplementalRows = managerEmployeeRows
      .filter(
        (row) =>
          row.doneTasks.length > 0 &&
          !managerDoneTodayRows.some(
            (doneRow) => doneRow.employee.id === row.employee.id,
          ),
      )
      .sort((left, right) => {
        if (left.doneTasks.length !== right.doneTasks.length) {
          return right.doneTasks.length - left.doneTasks.length;
        }

        return buildEmployeeName(
          left.employee.firstName,
          left.employee.lastName,
        ).localeCompare(
          buildEmployeeName(right.employee.firstName, right.employee.lastName),
          locale,
        );
      });

    let index = 0;
    while (index < supplementalRows.length && result.length < limit) {
      const doneCount = supplementalRows[index].doneTasks.length;
      const tiedRows = supplementalRows.filter(
        (row) => row.doneTasks.length === doneCount,
      );

      result.push(...tiedRows);
      index += tiedRows.length;
    }

    return result;
  }, [
    locale,
    managerDaySummary.employeesOnShift,
    managerDoneTodayRows,
    managerEmployeeRows,
  ]);

  useEffect(() => {
    if (!assignShiftSheetVisible) {
      return;
    }

    if (!assignShiftTemplateId && shiftTemplates[0]) {
      setAssignShiftTemplateId(shiftTemplates[0].id);
    }
  }, [
    assignShiftSheetVisible,
    assignShiftTemplateId,
    shiftTemplates,
  ]);

  useEffect(() => {
    const groupIds = managerShiftGroups.map((group) => group.id);
    const groupKey = groupIds.join("|");
    const groupsChanged = managerShiftGroupKeyRef.current !== groupKey;
    managerShiftGroupKeyRef.current = groupKey;

    setExpandedManagerShiftGroupIds((current) => {
      const availableIds = new Set(groupIds);
      const next = current.filter((id) => availableIds.has(id));
      const nextExpandedIds =
        next.length > 0 || !groupsChanged
          ? next
          : groupIds;

      const isSameSelection =
        nextExpandedIds.length === current.length &&
        nextExpandedIds.every((id, index) => id === current[index]);

      if (isSameSelection) {
        return current;
      }

      return nextExpandedIds;
    });
  }, [managerShiftGroups]);

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

  function toggleManagerShiftGroupExpanded(groupId: string) {
    hapticSelection();
    setExpandedManagerShiftGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
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
    setEditingShiftId(null);
    const nextTemplateId = shiftTemplates[0]?.id ?? "";
    setAssignShiftEmployeeIds(
      employeeId
        ? [employeeId]
        : assignShiftEmployeeOptions[0]
          ? [assignShiftEmployeeOptions[0].id]
          : [],
    );
    setAssignShiftTemplateId(nextTemplateId);
    applyAssignShiftBreakDefaults(nextTemplateId);
    setTemplateComposerVisible(false);
    setTemplateTimePickerTarget(null);
    setTemplateBreakDurationPickerVisible(false);
    setAssignShiftBreakPickerVisible(false);
    setAssignShiftBreakDurationPickerVisible(false);
    setAssignShiftSheetVisible(true);
  }

  function openEditShiftSheet(shift: ManagerScheduleShift) {
    hapticSelection();
    setAssignShiftError(null);
    setEditingShiftId(shift.id);
    setAssignShiftEmployeeIds([shift.employeeId]);
    setAssignShiftTemplateId(shift.template.id);
    setAssignShiftBreakEnabled((shift.fixedBreakDurationMinutes ?? 0) > 0);
    setAssignShiftBreakStartsAt(
      parseLocalTime(
        shift.fixedBreakStartsAt
          ? new Date(shift.fixedBreakStartsAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : shift.template.fixedBreakStartsAtLocal,
      ) ?? { hour: 13, minute: 0 },
    );
    setAssignShiftBreakDurationMinutes(
      String(shift.fixedBreakDurationMinutes || 30),
    );
    setTemplateComposerVisible(false);
    setTemplateTimePickerTarget(null);
    setTemplateBreakDurationPickerVisible(false);
    setAssignShiftBreakPickerVisible(false);
    setAssignShiftBreakDurationPickerVisible(false);
    setAssignShiftSheetVisible(true);
  }

  function applyAssignShiftBreakDefaults(templateId: string) {
    const template = shiftTemplates.find((item) => item.id === templateId);
    const breakDuration = template?.fixedBreakDurationMinutes ?? 0;
    const breakStartsAt =
      parseLocalTime(template?.fixedBreakStartsAtLocal) ?? {
        hour: 13,
        minute: 0,
      };

    setAssignShiftBreakEnabled(breakDuration > 0);
    setAssignShiftBreakStartsAt(breakStartsAt);
    setAssignShiftBreakDurationMinutes(String(breakDuration || 30));
  }

  function toggleAssignShiftEmployee(employeeId: string) {
    setAssignShiftError(null);
    if (editingShiftId) {
      setAssignShiftEmployeeIds([employeeId]);
      return;
    }

    setAssignShiftEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  function toggleTemplateDraftWeekDay(day: number) {
    hapticSelection();
    setTemplateDraft((current) => {
      const weekDays = current.weekDays.includes(day)
        ? current.weekDays.filter((value) => value !== day)
        : [...current.weekDays, day].sort((left, right) => left - right);

      return {
        ...current,
        weekDays,
      };
    });
  }

  async function submitShiftTemplateCreation() {
    const name = templateDraft.name.trim();
    const fixedBreakDuration = Number(
      templateDraft.fixedBreakDurationMinutes,
    );

    if (!name || templateDraft.weekDays.length === 0) {
      setAssignShiftError(t("calendar.shiftTemplateValidation"));
      return;
    }

    if (
      templateDraft.fixedBreakEnabled &&
      (!Number.isFinite(fixedBreakDuration) || fixedBreakDuration <= 0)
    ) {
      setAssignShiftError(t("calendar.fixedBreakValidation"));
      return;
    }

    setTemplateSubmitting(true);
    setAssignShiftError(null);

    try {
      const createdTemplate = await createManagerShiftTemplate({
        name,
        code: buildClientTemplateCode(name),
        startsAtLocal: formatLocalTime(templateDraft.startsAt),
        endsAtLocal: formatLocalTime(templateDraft.endsAt),
        weekDays: templateDraft.weekDays,
        gracePeriodMinutes: 10,
        fixedBreakStartsAtLocal: templateDraft.fixedBreakEnabled
          ? formatLocalTime(templateDraft.fixedBreakStartsAt)
          : undefined,
        fixedBreakDurationMinutes: templateDraft.fixedBreakEnabled
          ? fixedBreakDuration
          : 0,
        fixedBreakIsPaid: false,
      });

      setShiftTemplates((current) => [createdTemplate, ...current]);
      setAssignShiftTemplateId(createdTemplate.id);
      setTemplateDraft(createDefaultShiftTemplateDraft());
      setTemplateComposerVisible(false);
      setTemplateTimePickerTarget(null);
      setTemplateBreakDurationPickerVisible(false);
    } catch (nextError) {
      setAssignShiftError(
        nextError instanceof Error
          ? nextError.message
          : t("calendar.shiftTemplateCreateError"),
      );
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function submitManagerShiftAssignment() {
    const fixedBreakDuration = Number(assignShiftBreakDurationMinutes);

    if (assignShiftEmployeeIds.length === 0 || !assignShiftTemplateId) {
      setAssignShiftError(t("calendar.assignShiftValidation"));
      return;
    }

    if (
      assignShiftBreakEnabled &&
      (!Number.isFinite(fixedBreakDuration) || fixedBreakDuration <= 0)
    ) {
      setAssignShiftError(t("calendar.fixedBreakValidation"));
      return;
    }

    if (!canAssignShiftForSelectedDay) {
      setAssignShiftError(t("calendar.assignShiftPastDate"));
      return;
    }

    setAssignShiftSubmitting(true);
    setAssignShiftError(null);

    try {
      if (editingShiftId) {
        const updatedShift = await updateManagerShift(editingShiftId, {
          employeeId: assignShiftEmployeeIds[0],
          templateId: assignShiftTemplateId,
          shiftDate: selectedDayKey,
          fixedBreakStartsAtLocal: assignShiftBreakEnabled
            ? formatLocalTime(assignShiftBreakStartsAt)
            : undefined,
          fixedBreakDurationMinutes: assignShiftBreakEnabled
            ? fixedBreakDuration
            : 0,
          fixedBreakIsPaid: false,
        });

        setManagerShifts((current) =>
          current.map((shift) =>
            shift.id === updatedShift.id ? updatedShift : shift,
          ),
        );
        setAssignShiftSheetVisible(false);
        setEditingShiftId(null);
        setTemplateBreakDurationPickerVisible(false);
        setAssignShiftBreakPickerVisible(false);
        setAssignShiftBreakDurationPickerVisible(false);
        return;
      }

      const createdShifts = await Promise.all(
        assignShiftEmployeeIds.map((employeeId) =>
          createManagerShift({
            employeeId,
            templateId: assignShiftTemplateId,
            shiftDate: selectedDayKey,
            fixedBreakStartsAtLocal: assignShiftBreakEnabled
              ? formatLocalTime(assignShiftBreakStartsAt)
              : undefined,
            fixedBreakDurationMinutes: assignShiftBreakEnabled
              ? fixedBreakDuration
              : 0,
            fixedBreakIsPaid: false,
          }),
        ),
      );

      setManagerShifts((current) => [...createdShifts, ...current]);
      setAssignShiftSheetVisible(false);
      setAssignShiftEmployeeIds([]);
      setAssignShiftTemplateId("");
      setEditingShiftId(null);
      setTemplateBreakDurationPickerVisible(false);
      setAssignShiftBreakPickerVisible(false);
      setAssignShiftBreakDurationPickerVisible(false);
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

  async function cancelManagerShiftForDay(shift: ManagerScheduleShift) {
    hapticSelection();
    setShiftActionId(shift.id);
    setAssignShiftError(null);

    try {
      const cancelledShift = await cancelManagerShift(shift.id);
      setManagerShifts((current) =>
        current.map((item) =>
          item.id === cancelledShift.id ? cancelledShift : item,
        ),
      );
      if (expandedManagerEmployeeId === shift.employeeId) {
        setExpandedManagerEmployeeId(null);
      }
    } catch (nextError) {
      setAssignShiftError(
        nextError instanceof Error
          ? nextError.message
          : t("calendar.shiftCancelError"),
      );
    } finally {
      setShiftActionId(null);
    }
  }

  function renderManagerTaskLeading(task: TaskItem, photoCount = 0) {
    if (photoCount > 0) {
      return <Ionicons color="#6d73ff" name="images-outline" size={18} />;
    }

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

  function isCalendarDayBeforeOrganizationStart(day: number) {
    if (!organizationStartDate) {
      return false;
    }

    return (
      startOfDay(new Date(year, monthIndex, day)).getTime() <
      organizationStartDate.getTime()
    );
  }

  function changeMonth(offset: number) {
    if (offset < 0 && !canGoToPreviousMonth) {
      return;
    }

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
    setManagerCalendarTab("all");
    setOverdueSheetVisible(false);
  }

  function closePhotoViewer() {
    setActivePhotoTaskId(null);
    setSelectedPhotoId(null);
  }

  function openTaskPhotos(task: TaskItem) {
    hapticSelection();
    setActivePhotoTaskId(task.id);
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
                : t("calendar.moveShort")
            }
            onPress={() => openRescheduleSheet(task)}
            textClassName="text-[13px] text-foreground"
            variant="secondary"
          />
          {includeOpenTaskDay ? (
            <Button
              className="min-h-11 flex-1 border-[#dce4f2] bg-white"
              disabled={isPendingForTask}
              label={t("calendar.openTaskDayShort")}
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

  function renderManagerAllOverview() {
    return (
      <View className="gap-4">
        <View className="flex-row items-center justify-between gap-4 px-5">
          <View className="min-w-0 flex-1">
            <Text className="font-display text-[20px] font-extrabold text-foreground">
              {t("calendar.managerTasksDoneSummary", {
                done: managerDaySummary.done,
                total: managerDaySummary.total,
              })}
            </Text>
          </View>
          <View className="min-w-[88px] flex-row items-center justify-end gap-2">
            <Ionicons color="#315cf6" name="people-outline" size={18} />
            <Text
              className="font-display text-[22px] font-extrabold text-foreground"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {managerDaySummary.employeesOnShift}/{managerDaySummary.employees}
            </Text>
          </View>
        </View>

        <View className="rounded-[30px] border border-white bg-white px-5 py-4 shadow-sm shadow-[#1f2687]/10">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <Ionicons color="#ff1f1f" name="warning-outline" size={18} />
              <Text className="font-display text-[17px] font-extrabold text-foreground">
                {t("calendar.topOverdueEmployees")}
              </Text>
            </View>
            <Text
              className="font-display text-[18px] font-extrabold text-[#ff1f1f]"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {overdueTasks.length}
            </Text>
          </View>

          {topOverdueEmployeeRows.length ? (
            <View className="gap-3">
              {topOverdueEmployeeRows.map((row) => {
                const avatarKey = row.employee?.id ?? row.id;
                const avatarSource = row.avatarSource;
                const showAvatar =
                  avatarSource && !failedAvatarEmployeeIds.has(avatarKey);

                return (
                  <View
                    className="flex-row items-center gap-3"
                    key={row.id}
                  >
                    {showAvatar ? (
                      <Image
                        className="h-11 w-11 rounded-2xl"
                        onError={() => markAvatarFailed(avatarKey)}
                        resizeMode="cover"
                        source={avatarSource}
                      />
                    ) : row.employee ? (
                      <Image
                        className="h-11 w-11 rounded-2xl bg-[#eef2ff]"
                        resizeMode="cover"
                        source={resolveEmployeeAvatarSource(row.employee)}
                      />
                    ) : (
                      <Image
                        className="h-11 w-11 rounded-2xl bg-[#eef2ff]"
                        resizeMode="cover"
                        source={resolveEmployeeAvatarSource({
                          firstName: row.firstName,
                          id: row.id,
                          lastName: row.lastName,
                        })}
                      />
                    )}
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-body text-[15px] font-extrabold text-foreground"
                        numberOfLines={1}
                      >
                        {row.employeeName}
                      </Text>
                      <Text
                        className="mt-0.5 font-body text-[12px] leading-5 text-[#7b8798]"
                        numberOfLines={1}
                      >
                        {row.groupTitle}
                      </Text>
                    </View>
                    <Text
                      className="font-display text-[20px] font-extrabold text-[#ff1f1f]"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {row.tasks.length}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="font-body text-[13px] leading-5 text-[#7b8798]">
              {t("calendar.noOverdueTasks")}
            </Text>
          )}
        </View>

        <View className="overflow-hidden rounded-[30px] border border-white bg-white shadow-sm shadow-[#1f2687]/10">
          <View className="flex-row items-center justify-between gap-3 bg-white px-5 py-4">
            <View className="flex-row items-center gap-2">
              <Ionicons color="#16a34a" name="checkmark-circle-outline" size={19} />
              <Text className="font-display text-[17px] font-extrabold text-foreground">
                {t("calendar.doneTodayEmployees")}
              </Text>
            </View>
            <Text
              className="font-display text-[18px] font-extrabold text-[#16a34a]"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {managerDoneTodayRows.length}
            </Text>
          </View>

          {managerDoneEmployeeRows.length ? (
            managerDoneEmployeeRows.map((row, index) => {
              const doneRowId = `done:${row.employee.id}`;
              const isExpanded = expandedManagerEmployeeId === doneRowId;
              const showAvatar =
                row.employee.avatar &&
                !failedAvatarEmployeeIds.has(row.employee.id);
              const subtitle = row.shift
                ? `${row.shift.template.name} · ${formatShiftRange(row.shift, locale)}`
                : getEmployeeSubtitle(row.employee);

              return (
                <View key={doneRowId}>
                  <PressableScale
                    className="px-5 py-4"
                    haptic="selection"
                    onPress={() => toggleManagerEmployeeExpanded(doneRowId)}
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
                          className="h-12 w-12 rounded-2xl"
                          onError={() => markAvatarFailed(row.employee.id)}
                          resizeMode="cover"
                          source={row.employee.avatar}
                        />
                      ) : (
                        <Image
                          className="h-12 w-12 rounded-2xl bg-[#eef2ff]"
                          resizeMode="cover"
                          source={resolveEmployeeAvatarSource(row.employee)}
                        />
                      )}
                      <View className="min-w-0 flex-1">
                        <Text
                          className="font-display text-[17px] font-bold text-foreground"
                          numberOfLines={1}
                        >
                          {buildEmployeeName(
                            row.employee.firstName,
                            row.employee.lastName,
                          )}
                        </Text>
                        <Text
                          className="mt-0.5 font-body text-[12px] leading-5 text-[#7b8798]"
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      </View>
                      <Text
                        className="font-display text-[20px] font-extrabold text-[#16a34a]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {row.doneTasks.length}
                      </Text>
                    </View>
                  </PressableScale>

                  {isExpanded ? (
                    <View className="gap-1 border-t border-[#e4ebf5] px-5 pb-5 pt-4">
                      {row.doneTasks.map((task) => {
                        const photoCount = buildTaskPhotos(task, locale).length;
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
                        const rowContent = (
                          <View className="flex-row items-start gap-3 px-1 py-2">
                            <View className="w-6 items-center pt-0.5">
                              {renderManagerTaskLeading(task, photoCount)}
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className="font-body text-[15px] leading-6 text-[#16a34a] line-through"
                                numberOfLines={2}
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

                        return photoCount > 0 ? (
                          <PressableScale
                            haptic="selection"
                            key={task.id}
                            onPress={() => openTaskPhotos(task)}
                          >
                            {rowContent}
                          </PressableScale>
                        ) : (
                          <View key={task.id}>{rowContent}</View>
                        );
                      })}
                    </View>
                  ) : null}

                  {index < managerDoneEmployeeRows.length - 1 ? (
                    <View className="h-px bg-[#edf1f7]" />
                  ) : null}
                </View>
              );
            })
          ) : (
            <View className="px-5 py-5">
              <Text className="text-center font-body text-[13px] leading-5 text-[#7b8798]">
                {t("calendar.noDoneTasksToday")}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderManagerOverdueEmployeeList() {
    if (overdueEmployeeRows.length === 0) {
      return (
        <View className="px-5 py-3">
          <Text className="text-center font-body text-sm leading-6 text-muted-foreground">
            {t("calendar.noOverdueTasks")}
          </Text>
        </View>
      );
    }

    return (
      <View className="overflow-hidden rounded-[30px] border border-white/40 bg-white/78 shadow-sm shadow-[#1f2687]/10">
        {overdueEmployeeRows.map((row, index) => {
          const avatarKey = row.employee?.id ?? row.id;
          const avatarSource = row.avatarSource;
          const showAvatar =
            avatarSource && !failedAvatarEmployeeIds.has(avatarKey);
          const isExpanded = expandedManagerEmployeeId === row.id;

          return (
            <View key={row.id}>
              <Animated.View
                entering={FadeInUp.delay(index * 18)
                  .duration(170)
                  .withInitialValues({
                    opacity: 0,
                    transform: [{ translateY: 8 }],
                  })}
              >
                <PressableScale
                  className="px-5 py-5"
                  haptic="selection"
                  onPress={() => toggleManagerEmployeeExpanded(row.id)}
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
                        className="h-14 w-14 rounded-2xl"
                        onError={() => markAvatarFailed(avatarKey)}
                        resizeMode="cover"
                        source={avatarSource}
                      />
                    ) : row.employee ? (
                      <Image
                        className="h-14 w-14 rounded-2xl bg-[#eef2ff]"
                        resizeMode="cover"
                        source={resolveEmployeeAvatarSource(row.employee)}
                      />
                    ) : row.firstName || row.lastName ? (
                      <Image
                        className="h-14 w-14 rounded-2xl bg-[#eef2ff]"
                        resizeMode="cover"
                        source={resolveEmployeeAvatarSource({
                          firstName: row.firstName,
                          id: row.id,
                          lastName: row.lastName,
                        })}
                      />
                    ) : (
                      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f2]">
                        <Ionicons
                          color="#dc2626"
                          name="people-outline"
                          size={22}
                        />
                      </View>
                    )}
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-display text-[18px] font-bold text-foreground"
                        numberOfLines={1}
                      >
                        {row.employeeName}
                      </Text>
                      <Text
                        className="mt-1 font-body text-[13px] leading-5 text-[#7b8798]"
                        numberOfLines={1}
                      >
                        {row.groupTitle}
                      </Text>
                    </View>
                    <View className="min-w-10 items-end justify-center self-stretch">
                      <Text
                        className="font-display text-[22px] font-extrabold text-[#ff1f1f]"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {row.tasks.length}
                      </Text>
                    </View>
                  </View>
                </PressableScale>

                {isExpanded ? (
                  <View className="border-t border-[#e4ebf5] px-5 pb-4 pt-2">
                    {row.tasks.map((item, taskIndex) => (
                      <View key={item.task.id}>
                        <View className="px-1 py-3">
                          <View className="flex-row items-start gap-3">
                            <View className="w-6 items-center pt-1">
                              <Ionicons
                                color="#dc2626"
                                name="warning-outline"
                                size={18}
                              />
                            </View>
                            <View className="min-w-0 flex-1">
                              <View className="flex-row items-start gap-2">
                                <Text
                                  className="min-w-0 flex-1 font-body text-[15px] font-semibold leading-6 text-foreground"
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>
                                {item.photoCount > 0 ? (
                                  <PressableScale
                                    className="mt-0.5 flex-row items-center gap-1 rounded-full bg-[#eef3ff] px-2 py-1"
                                    haptic="selection"
                                    onPress={() => openTaskPhotos(item.task)}
                                  >
                                    <Ionicons
                                      color="#315cf6"
                                      name="images-outline"
                                      size={13}
                                    />
                                    <Text className="font-body text-[11px] font-extrabold text-[#315cf6]">
                                      {item.photoCount}
                                    </Text>
                                  </PressableScale>
                                ) : null}
                              </View>
                              <Text className="mt-2 font-body text-[12px] font-semibold text-[#dc2626]">
                                {t("calendar.overdueFrom", {
                                  dateLabel: item.dateLabel,
                                })}
                              </Text>
                            </View>
                          </View>
                          {renderOverdueTaskActions(item.task, true)}
                        </View>
                        {taskIndex < row.tasks.length - 1 ? (
                          <View className="h-px bg-[#edf1f7]" />
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
              {index < overdueEmployeeRows.length - 1 ? (
                <View className="h-px bg-[#edf1f7]" />
              ) : null}
            </View>
          );
        })}
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
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                setRefreshing(true);
                setManualRefreshSignal((current) => current + 1);
              }}
              refreshing={refreshing}
              tintColor="#315cf6"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
            <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
              <View className="mb-5 flex-row items-center justify-between">
                <PressableScale
                  className={`rounded-xl p-2 ${canGoToPreviousMonth ? "" : "opacity-40"}`}
                  disabled={!canGoToPreviousMonth}
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
                            className={`h-10 w-10 items-center justify-center rounded-full ${
                              isCalendarDayBeforeOrganizationStart(day)
                                ? "opacity-35"
                                : ""
                            }`}
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
                            disabled={isCalendarDayBeforeOrganizationStart(day)}
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
                <View className="h-[52px] flex-row items-center gap-3 rounded-[22px] bg-white px-4 shadow-sm shadow-[#1f2687]/10">
                  <Ionicons color="#8a96ab" name="search-outline" size={18} />
                  <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="min-h-[0px] flex-1 border-0 bg-transparent px-0 py-0 text-[15px] text-foreground shadow-none"
                    onChangeText={setManagerTaskSearch}
                    placeholder={t("calendar.managerTaskSearchPlaceholder")}
                    returnKeyType="search"
                    value={managerTaskSearch}
                  />
                  {managerTaskSearch ? (
                    <PressableScale
                      className="h-8 w-8 items-center justify-center rounded-full bg-[#eef3ff]"
                      haptic="selection"
                      onPress={() => setManagerTaskSearch("")}
                    >
                      <Ionicons color="#6b7a90" name="close" size={16} />
                    </PressableScale>
                  ) : null}
                </View>

                <View className="gap-4 px-5">
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1">
                      <Text className="font-display text-[22px] font-bold text-foreground">
                        {selectedDayLabel}
                      </Text>
                      <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                        <Text className="font-body text-sm leading-6 text-muted-foreground">
                          {t("calendar.managerTasksDoneSummary", {
                            done: managerDaySummary.done,
                            total: managerDaySummary.total,
                          })}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Ionicons color="#6b7a90" name="people-outline" size={15} />
                          <Text
                            className="font-body text-sm leading-6 text-muted-foreground"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {managerDaySummary.employeesOnShift}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <PressableScale
                      className="h-[40px] justify-center rounded-[20px] bg-[#315cf6] px-4 shadow-sm shadow-[#315cf6]/25"
                      disabled={!canAssignShiftForSelectedDay}
                      haptic="selection"
                      onPress={() => openAssignShiftSheet()}
                    >
                      <View className="flex-row items-center gap-2">
                        <Ionicons color="#ffffff" name="calendar-outline" size={16} />
                        <Text className="font-display text-[13px] font-semibold leading-[18px] text-white">
                          {t("calendar.assignShift")}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>

                  <PressableScale
                    className="h-[58px] justify-center rounded-[24px] bg-white px-5 shadow-sm shadow-[#1f2687]/10"
                    haptic="selection"
                    onPress={() => setManagerFilterSheetVisible(true)}
                  >
                    <View className="flex-row items-center justify-between gap-4">
                      <Text
                        className="min-w-0 flex-1 font-display text-[19px] font-bold leading-6 text-foreground"
                        numberOfLines={1}
                      >
                        {managerFilterLabel}
                      </Text>
                      <Ionicons color="#315cf6" name="chevron-down" size={22} />
                    </View>
                  </PressableScale>

                </View>

                {!isManagerTaskSearchActive ? (
                  <ScrollView
                    className="-mx-5"
                    contentContainerStyle={{
                      gap: 8,
                      paddingHorizontal: 20,
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {managerCalendarTabs.map((item) => {
                      const isActive = item.key === managerCalendarTab;
                      const badgeTextClassName =
                        item.tone === "warning"
                          ? "text-[#f59e0b]"
                          : item.tone === "success"
                            ? "text-[#16a34a]"
                            : "text-[#315cf6]";

                      return (
                        <PressableScale
                          className={`h-11 flex-row items-center gap-2 rounded-[18px] border bg-white px-4 shadow-sm shadow-[#1f2687]/10 ${
                            isActive ? "border-[#315cf6]" : "border-[#dbe3ef]"
                          }`}
                          haptic="selection"
                          key={item.key}
                          onPress={() => setManagerCalendarTab(item.key)}
                        >
                          <Text
                            className={`font-body text-[13px] font-extrabold ${
                              isActive ? "text-[#315cf6]" : "text-[#4b5563]"
                            }`}
                          >
                            {item.label}
                          </Text>
                          {item.count !== null ? (
                            <Text
                              className={`font-body text-[13px] font-extrabold ${badgeTextClassName}`}
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {item.count}
                            </Text>
                          ) : null}
                        </PressableScale>
                      );
                    })}
                  </ScrollView>
                ) : null}

                {loading ? (
                  <View className="rounded-[28px] border border-white/40 bg-white/78 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
                    <Text className="font-body text-sm text-muted-foreground">
                      {t("common.loading")}
                    </Text>
                  </View>
                ) : isManagerTaskSearchActive ? (
                  managerTaskSearchResults.length ? (
                    <View className="overflow-hidden rounded-[30px] border border-white/40 bg-white/78 shadow-sm shadow-[#1f2687]/10">
                      {managerTaskSearchResults.map((result, index) => {
                        const canOpenPhotos = result.photoCount > 0;
                        const employeeId =
                          result.employee?.id ??
                          result.task.assigneeEmployee?.id ??
                          result.task.id;
                        const avatarSource = result.employee?.avatar;
                        const showAvatar =
                          avatarSource &&
                          !failedAvatarEmployeeIds.has(employeeId);
                        const titleClassName = result.isOverdue
                          ? "text-[#dc2626]"
                          : result.visuallyDone
                            ? "text-[#16a34a] line-through"
                            : "text-foreground";
                        const dateToneClassName = result.isOverdue
                          ? "bg-[#fee2e2]"
                          : result.visuallyDone
                            ? "bg-[#dcfce7]"
                            : "bg-[#eef3ff]";
                        const dateTextClassName = result.isOverdue
                          ? "text-[#dc2626]"
                          : result.visuallyDone
                            ? "text-[#16a34a]"
                            : "text-[#315cf6]";

                        return (
                          <PressableScale
                            haptic="selection"
                            key={result.task.id}
                            onPress={() =>
                              canOpenPhotos
                                ? openTaskPhotos(result.task)
                                : openTaskDay(result.task)
                            }
                          >
                            <View
                              className={`flex-row items-start gap-3 px-5 py-4 ${
                                index < managerTaskSearchResults.length - 1
                                  ? "border-b border-[#edf1f7]"
                                  : ""
                              }`}
                            >
                              <View
                                className={`h-14 w-14 items-center justify-center rounded-2xl ${dateToneClassName}`}
                              >
                                <Text
                                  className={`font-display text-[19px] font-extrabold leading-6 ${dateTextClassName}`}
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {result.dayNumber}
                                </Text>
                                <Text
                                  className={`font-body text-[10px] font-bold uppercase leading-3 ${dateTextClassName}`}
                                  numberOfLines={1}
                                >
                                  {result.monthLabel}
                                </Text>
                              </View>

                              <View className="min-w-0 flex-1">
                                <View className="flex-row items-start gap-2">
                                  <Text
                                    className={`min-w-0 flex-1 font-body text-[15px] font-semibold leading-6 ${titleClassName}`}
                                    numberOfLines={2}
                                  >
                                    {result.title}
                                  </Text>
                                  {canOpenPhotos ? (
                                    <View className="mt-0.5 flex-row items-center gap-1 rounded-full bg-[#eef3ff] px-2 py-1">
                                      <Ionicons
                                        color="#315cf6"
                                        name="images-outline"
                                        size={13}
                                      />
                                      <Text className="font-body text-[11px] font-extrabold text-[#315cf6]">
                                        {result.photoCount}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>

                                <View className="mt-2 flex-row items-center gap-2">
                                  {showAvatar ? (
                                    <Image
                                      className="h-7 w-7 rounded-full"
                                      onError={() => markAvatarFailed(employeeId)}
                                      resizeMode="cover"
                                      source={avatarSource}
                                    />
                                  ) : (
                                    <Image
                                      className="h-7 w-7 rounded-full bg-[#eef2ff]"
                                      resizeMode="cover"
                                      source={resolveEmployeeAvatarSource({
                                        firstName: result.firstName,
                                        id: employeeId,
                                        lastName: result.lastName,
                                      })}
                                    />
                                  )}
                                  <Text
                                    className="min-w-0 flex-1 font-body text-[12px] font-semibold text-[#7b8798]"
                                    numberOfLines={1}
                                  >
                                    {result.employeeName}
                                  </Text>
                                  {result.isOverdue ? (
                                    <Text className="font-body text-[11px] font-extrabold uppercase text-[#dc2626]">
                                      {t("calendar.statusOverdue")}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            </View>
                          </PressableScale>
                        );
                      })}
                    </View>
                  ) : (
                    <View className="px-5 py-3">
                      <Text className="text-center font-body text-sm leading-6 text-muted-foreground">
                        {t("calendar.managerNoTasksForSearch")}
                      </Text>
                    </View>
                  )
                ) : managerCalendarTab === "all" ? (
                  renderManagerAllOverview()
                ) : managerCalendarTab === "overdue" ? (
                  renderManagerOverdueEmployeeList()
                ) : filteredManagerEmployeeRows.length ? (
                  <View className="overflow-hidden rounded-[30px] border border-white/40 bg-white/78 shadow-sm shadow-[#1f2687]/10">
                    {filteredManagerEmployeeRows.map((row, index) => {
                      const groupId = getManagerShiftGroupId(row.shift);
                      const group = managerShiftGroups.find(
                        (item) => item.id === groupId,
                      );
                      const previousRow = filteredManagerEmployeeRows[index - 1];
                      const previousGroupId = previousRow
                        ? getManagerShiftGroupId(previousRow.shift)
                        : null;
                      const nextRow = filteredManagerEmployeeRows[index + 1];
                      const nextGroupId = nextRow
                        ? getManagerShiftGroupId(nextRow.shift)
                        : null;
                      const showGroupHeader = groupId !== previousGroupId;
                      const isLastInGroup = groupId !== nextGroupId;
                      const isGroupExpanded =
                        expandedManagerShiftGroupIds.includes(groupId) ||
                        isManagerTaskSearchActive;
                      const isExpanded =
                        isManagerTaskSearchActive ||
                        expandedManagerEmployeeId === row.employee.id;
                      const showAvatar =
                        row.employee.avatar &&
                        !failedAvatarEmployeeIds.has(row.employee.id);
                      const subtitle = getEmployeeSubtitle(row.employee);
                      const authorName = row.shift?.createdByEmployee
                        ? buildEmployeeName(
                            row.shift.createdByEmployee.firstName,
                            row.shift.createdByEmployee.lastName,
                          )
                        : "";
                      const openTasks = row.plannedTasks.filter((task) =>
                        isTaskOpen(task.status),
                      );
                      const pendingTasks = openTasks.filter(
                        (task) => !isOverdueTask(task, today),
                      );
                      const visibleRowTasks =
                        managerCalendarTab === "pending"
                          ? pendingTasks
                          : managerCalendarTab === "done"
                            ? row.doneTasks
                            : row.assignedTasks;
                      const taskCountText = String(visibleRowTasks.length);
                      const shouldShowTaskLabel = true;
                      const taskLabel =
                        managerCalendarTab === "done"
                          ? t("calendar.tabDone")
                          : t("calendar.tasksShort");
                      const taskCountClassName =
                        managerCalendarTab === "done"
                          ? "text-[#16a34a]"
                          : "text-foreground";

                      return (
                        <View key={`${groupId}:${row.employee.id}`}>
                          {showGroupHeader ? (
                            <PressableScale
                              className="border-b border-[#e4ebf5] bg-[#f8fbff] px-5 py-4"
                              haptic="selection"
                              onPress={() => toggleManagerShiftGroupExpanded(groupId)}
                            >
                              <View className="flex-row items-center justify-between gap-3">
                                <View className="min-w-0 flex-1">
                                  <Text
                                    className="font-display text-[16px] font-extrabold text-foreground"
                                    numberOfLines={1}
                                  >
                                    {group?.title ?? t("calendar.withoutShift")}
                                  </Text>
                                  {groupId !== "without-shift" ? (
                                    <Text className="mt-1 font-body text-[12px] font-semibold text-[#315cf6]">
                                      {group?.subtitle ?? t("calendar.noShiftAssigned")}
                                    </Text>
                                  ) : null}
                                </View>
                                <View className="flex-row items-center gap-2">
                                  <Text
                                    className="font-body text-[15px] font-extrabold text-[#315cf6]"
                                    style={{ fontVariant: ["tabular-nums"] }}
                                  >
                                    {group?.rows.length ?? 0}
                                  </Text>
                                  <Ionicons
                                    color="#6b7a90"
                                    name={
                                      isGroupExpanded
                                        ? "chevron-up"
                                        : "chevron-down"
                                    }
                                    size={18}
                                  />
                                </View>
                              </View>
                            </PressableScale>
                          ) : null}
                          {isGroupExpanded ? (
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
                                  className="h-14 w-14 rounded-2xl"
                                  onError={() => markAvatarFailed(row.employee.id)}
                                  resizeMode="cover"
                                  source={row.employee.avatar}
                                />
                              ) : (
                                <Image
                                  className="h-14 w-14 rounded-2xl bg-[#eef2ff]"
                                  resizeMode="cover"
                                  source={resolveEmployeeAvatarSource(row.employee)}
                                />
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
                                  className={`font-display text-[18px] font-bold ${taskCountClassName}`}
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {taskCountText}
                                </Text>
                                {shouldShowTaskLabel ? (
                                  <Text className="mt-1 font-body text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8a96ab]">
                                    {taskLabel}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </PressableScale>

                          {isExpanded ? (
                            <View className="gap-3 border-t border-[#e4ebf5] px-5 pb-5 pt-4">
                                <View className="flex-row items-center justify-between gap-3">
                                  <Text className="font-body text-[14px] font-semibold text-[#42526b]">
                                    {t("manager.tasksToday")}
                                  </Text>
                                  {row.shift ? (
                                    <Text className="font-body text-[12px] font-semibold text-[#315cf6]">
                                      {formatShiftRange(row.shift, locale)}
                                    </Text>
                                  ) : null}
                                </View>

                                {row.shift ? (
                                  <View className="gap-3 rounded-[22px] bg-[#f8fbff] px-4 py-3">
                                    {authorName ? (
                                      <Text className="font-body text-[12px] font-semibold leading-5 text-[#7b8798]">
                                        {t("calendar.shiftAuthor")}: {authorName}
                                      </Text>
                                    ) : null}
                                    <View className="flex-row gap-2">
                                      <PressableScale
                                        className="h-10 flex-1 items-center justify-center rounded-2xl bg-white"
                                        haptic="selection"
                                        onPress={() => openEditShiftSheet(row.shift!)}
                                      >
                                        <Text className="font-body text-[13px] font-extrabold text-[#315cf6]">
                                          {t("calendar.editShift")}
                                        </Text>
                                      </PressableScale>
                                      <PressableScale
                                        className="h-10 flex-1 items-center justify-center rounded-2xl bg-[#fee2e2]"
                                        disabled={shiftActionId === row.shift.id}
                                        haptic="selection"
                                        onPress={() =>
                                          void cancelManagerShiftForDay(row.shift!)
                                        }
                                      >
                                        <Text className="font-body text-[13px] font-extrabold text-[#dc2626]">
                                          {shiftActionId === row.shift.id
                                            ? t("common.processing")
                                            : t("calendar.cancelShift")}
                                        </Text>
                                      </PressableScale>
                                    </View>
                                  </View>
                                ) : null}

                                {visibleRowTasks.length ? (
                                  <View className="gap-1">
                                    {visibleRowTasks.map((task) => {
                                      const isDone = task.status === "DONE";
                                      const photoCount = buildTaskPhotos(
                                        task,
                                        locale,
                                      ).length;
                                      const canOpenPhotos =
                                        isDone && photoCount > 0;
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
                                      const taskAuthorName = task.managerEmployee
                                        ? buildEmployeeName(
                                            task.managerEmployee.firstName,
                                            task.managerEmployee.lastName,
                                          )
                                        : "";
                                      const rowContent = (
                                        <View className="flex-row items-start gap-3 px-1 py-2">
                                          <View className="w-6 items-center pt-0.5">
                                            {renderManagerTaskLeading(
                                              task,
                                              photoCount,
                                            )}
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
                                            {taskAuthorName ? (
                                              <Text
                                                className="mt-0.5 font-body text-[12px] font-semibold leading-5 text-[#8a96ab]"
                                                numberOfLines={1}
                                              >
                                                {t("calendar.shiftAuthor")}: {taskAuthorName}
                                              </Text>
                                            ) : null}
                                          </View>
                                        </View>
                                      );

                                      return canOpenPhotos ? (
                                        <PressableScale
                                          haptic="selection"
                                          key={task.id}
                                          onPress={() => openTaskPhotos(task)}
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
                                    <Text className="text-center font-body text-[13px] leading-5 text-[#6b7280]">
                                      {t("manager.noEmployeeTasks")}
                                    </Text>
                                  </View>
                                )}
                            </View>
                          ) : null}

                          {!isLastInGroup ? <View className="h-px bg-[#edf1f7]" /> : null}
                            </Animated.View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="px-5 py-3">
                    <Text className="text-center font-body text-sm leading-6 text-muted-foreground">
                      {isManagerTaskSearchActive
                        ? t("calendar.managerNoTasksForSearch")
                        : managerEmployeeRows.length > 0
                          ? t("calendar.managerNoEmployeesForTab")
                        : t("calendar.managerNoEmployeesForFilter")}
                    </Text>
                  </View>
                )}
              </View>
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
                        {item.authorName ? (
                          <Text className="mt-1 font-body text-[12px] font-semibold text-[#8a96ab]">
                            {t("calendar.shiftAuthor")}: {item.authorName}
                          </Text>
                        ) : null}
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
        onClose={closePhotoViewer}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={activePhotoTask !== null}
      >
        {activePhotoTask ? (
          <View className="relative" style={{ paddingBottom: bottomSheetActionBottomOffset }}>
            <View>
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
                          className={`h-9 w-9 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-[#d7def5] bg-white"
                          }`}
                          haptic="selection"
                          key={photo.id}
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
                <View
                  className="mb-1 overflow-hidden rounded-[26px] bg-[#dbe7ff]"
                  style={{ height: photoViewerPreviewHeight }}
                >
                  <Image
                    onError={() => markPhotoLoadFailed(selectedPhoto.id)}
                    onLoad={() => clearPhotoLoadFailed(selectedPhoto.id)}
                    resizeMode="contain"
                    source={{ uri: selectedPhoto.uri }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {selectedPhotoFailed ? (
                    <View className="absolute inset-0 items-center justify-center bg-[#dbe7ff] px-6 pb-24">
                      <Ionicons color="#6d73ff" name="image-outline" size={28} />
                      <Text className="mt-3 text-center font-body text-sm leading-6 text-muted-foreground">
                        {t("common.photoUnavailable")}
                      </Text>
                    </View>
                  ) : null}
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
                  <Ionicons color="#6d73ff" name="images-outline" size={24} />
                  <Text className="mt-4 text-center font-body text-sm leading-6 text-muted-foreground">
                    {t("manager.noTaskPhotos")}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-4">
              <PressableScale
                className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} bg-primary`}
                haptic="selection"
                onPress={closePhotoViewer}
              >
                <Text className={`${BOTTOM_SHEET_ACTION_TEXT_CLASS} text-white`}>
                  {t("common.done")}
                </Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </BottomSheetModal>

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
                              const showAvatar =
                                employee.avatar &&
                                !failedAvatarEmployeeIds.has(employee.id);

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
                                    {showAvatar ? (
                                      <Image
                                        className="h-10 w-10 rounded-full"
                                        onError={() => markAvatarFailed(employee.id)}
                                        resizeMode="cover"
                                        source={employee.avatar}
                                      />
                                    ) : (
                                      <Image
                                        className="h-10 w-10 rounded-full bg-[#eef2ff]"
                                        resizeMode="cover"
                                        source={resolveEmployeeAvatarSource(employee)}
                                      />
                                    )}
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
                              <Image
                                className="h-10 w-10 rounded-full bg-[#eef2ff]"
                                resizeMode="cover"
                                source={resolveEmployeeAvatarSource(employee)}
                              />
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
          setEditingShiftId(null);
          setTemplateComposerVisible(false);
          setTemplateTimePickerTarget(null);
          setTemplateBreakDurationPickerVisible(false);
          setAssignShiftBreakPickerVisible(false);
          setAssignShiftBreakDurationPickerVisible(false);
        }}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={assignShiftSheetVisible}
      >
        <View
          className="max-h-[78vh] gap-4 px-5 pt-8"
          style={{ paddingBottom: bottomSheetActionBottomOffset }}
        >
          <View className="items-center">
            <Text className="text-center font-display text-[26px] font-extrabold text-foreground">
              {editingShiftId
                ? t("calendar.editShift")
                : t("calendar.assignShiftTitle")}
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
                  {!editingShiftId && assignShiftEmployeeIds.length > 0
                    ? ` (${assignShiftEmployeeIds.length})`
                    : ""}
                </Text>
                <View className="overflow-hidden rounded-[24px] border border-[#e7ecf5] bg-white">
                  {assignShiftEmployeeOptions.length ? (
                    assignShiftEmployeeOptions.map((employee, index) => {
                      const isSelected = assignShiftEmployeeIds.includes(
                        employee.id,
                      );
                      const showAvatar =
                        employee.avatar && !failedAvatarEmployeeIds.has(employee.id);

                      return (
                        <PressableScale
                          className={`px-4 py-3 ${
                            index < assignShiftEmployeeOptions.length - 1
                              ? "border-b border-[#e7ecf5]"
                              : ""
                          }`}
                          haptic="selection"
                          key={employee.id}
                          onPress={() => toggleAssignShiftEmployee(employee.id)}
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
                              <Image
                                className="h-10 w-10 rounded-full bg-[#eef2ff]"
                                resizeMode="cover"
                                source={resolveEmployeeAvatarSource(employee)}
                              />
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
                    })
                  ) : (
                    <View className="px-4 py-5">
                      <Text className="text-center font-body text-sm text-muted-foreground">
                        {t("manager.meetingNoEmployees")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between gap-3 px-1">
                  <Text className="font-body text-[12px] font-semibold uppercase tracking-[1.1px] text-[#8a96ab]">
                    {t("calendar.assignShiftTemplate")}
                  </Text>
                  <PressableScale
                    className="min-h-10 flex-row items-center gap-1 px-1 py-2"
                    disabled={templateSubmitting}
                    haptic="selection"
                    onPress={() => {
                      setAssignShiftError(null);
                      if (templateComposerVisible) {
                        setTemplateTimePickerTarget(null);
                        setTemplateBreakDurationPickerVisible(false);
                      }
                      setTemplateComposerVisible((current) => !current);
                    }}
                  >
                    <Ionicons
                      color="#315cf6"
                      name={templateComposerVisible ? "close" : "add"}
                      size={14}
                    />
                    <Text className="font-body text-[12px] font-extrabold text-[#315cf6]">
                      {templateComposerVisible
                        ? t("calendar.shiftTemplateHide")
                        : t("calendar.shiftTemplateNew")}
                    </Text>
                  </PressableScale>
                </View>

                {templateComposerVisible ? (
                  <View className="gap-4 rounded-[24px] border border-[#dfe7f2] bg-[#f8fbff] p-4">
                    <View>
                      <Input
                        autoCapitalize="words"
                        autoCorrect={false}
                        className="border-[#dce4f2] bg-white shadow-none"
                        editable={!templateSubmitting}
                        keyboardType={
                          Platform.OS === "android" ? "visible-password" : "default"
                        }
                        onChangeText={(name) =>
                          setTemplateDraft((current) => ({
                            ...current,
                            name,
                          }))
                        }
                        placeholder={t("calendar.shiftTemplateNamePlaceholder")}
                        value={templateDraft.name}
                      />
                    </View>

                    <View className="flex-row gap-3">
                      <PressableScale
                        className="h-20 justify-center rounded-2xl border border-[#dce4f2] bg-white px-4"
                        containerClassName="flex-1"
                        haptic="selection"
                        onPress={() => setTemplateTimePickerTarget("start")}
                      >
                        <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                          {t("calendar.shiftTemplateStart")}
                        </Text>
                        <Text className="mt-1 font-display text-[19px] font-extrabold leading-6 text-foreground">
                          {formatLocalTime(templateDraft.startsAt)}
                        </Text>
                      </PressableScale>
                      <PressableScale
                        className="h-20 justify-center rounded-2xl border border-[#dce4f2] bg-white px-4"
                        containerClassName="flex-1"
                        haptic="selection"
                        onPress={() => setTemplateTimePickerTarget("end")}
                      >
                        <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                          {t("calendar.shiftTemplateEnd")}
                        </Text>
                        <Text className="mt-1 font-display text-[19px] font-extrabold leading-6 text-foreground">
                          {formatLocalTime(templateDraft.endsAt)}
                        </Text>
                      </PressableScale>
                    </View>

                    <View className="rounded-[24px] border border-[#dce4f2] bg-white p-4">
                      <PressableScale
                        className="flex-row items-center gap-3"
                        haptic="selection"
                        onPress={() =>
                          setTemplateDraft((current) => ({
                            ...current,
                            fixedBreakEnabled: !current.fixedBreakEnabled,
                          }))
                        }
                      >
                        <View
                          className={`h-6 w-6 items-center justify-center rounded-full border ${
                            templateDraft.fixedBreakEnabled
                              ? "border-primary bg-primary"
                              : "border-[#d7deeb] bg-white"
                          }`}
                        >
                          {templateDraft.fixedBreakEnabled ? (
                            <Ionicons color="#ffffff" name="checkmark" size={13} />
                          ) : null}
                        </View>
                        <Text className="flex-1 font-body text-[14px] font-semibold text-foreground">
                          {t("calendar.fixedBreak")}
                        </Text>
                      </PressableScale>

                      {templateDraft.fixedBreakEnabled ? (
                        <View className="mt-4 gap-3">
                          <View className="flex-row gap-3">
                            <PressableScale
                              className="h-16 justify-center rounded-2xl border border-[#dce4f2] bg-[#f8fbff] px-4"
                              containerClassName="flex-1"
                              haptic="selection"
                              onPress={() => setTemplateTimePickerTarget("break")}
                            >
                              <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                                {t("calendar.fixedBreakStart")}
                              </Text>
                              <Text className="mt-1 font-display text-[18px] font-extrabold leading-6 text-foreground">
                                {formatLocalTime(templateDraft.fixedBreakStartsAt)}
                              </Text>
                            </PressableScale>
                            <PressableScale
                              className="h-16 justify-center rounded-2xl border border-[#dce4f2] bg-[#f8fbff] px-4"
                              containerClassName="flex-1"
                              haptic="selection"
                              onPress={() => setTemplateBreakDurationPickerVisible(true)}
                            >
                              <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                                {t("calendar.fixedBreakDuration")}
                              </Text>
                              <Text className="mt-1 font-display text-[18px] font-extrabold leading-6 text-foreground">
                                {formatBreakDurationLabel(
                                  templateDraft.fixedBreakDurationMinutes,
                                  language,
                                )}
                              </Text>
                            </PressableScale>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View className="mt-3">
                      <View className="flex-row items-center justify-between">
                        {weekdayLabels.map((label, index) => {
                          const day = index + 1;
                          const activeDay = templateDraft.weekDays.includes(day);

                          return (
                            <PressableScale
                              className={`h-10 w-10 items-center justify-center rounded-full border ${
                                activeDay
                                  ? "border-primary bg-primary"
                                  : "border-[#dce4f2] bg-white"
                              }`}
                              haptic="selection"
                              key={label}
                              onPress={() => toggleTemplateDraftWeekDay(day)}
                            >
                              <Text
                                className={`font-body text-[11px] font-extrabold ${
                                  activeDay ? "text-white" : "text-foreground"
                                }`}
                                numberOfLines={1}
                              >
                                {label}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </View>
                    </View>

                    <Button
                      className="min-h-12 rounded-[20px] border-transparent bg-[#315cf6] shadow-sm shadow-[#315cf6]/25"
                      disabled={templateSubmitting || !templateDraft.name.trim()}
                      fullWidth
                      label={
                        templateSubmitting
                          ? t("common.processing")
                          : t("calendar.shiftTemplateCreate")
                      }
                      onPress={() => {
                        void submitShiftTemplateCreation();
                      }}
                      textClassName="text-white"
                    />
                  </View>
                ) : null}

                {shiftTemplates.length ? (
                  <View className="overflow-hidden rounded-[24px] border border-[#e7ecf5] bg-white">
                    {shiftTemplates.map((template, index) => {
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
                          onPress={() => {
                            setAssignShiftTemplateId(template.id);
                            applyAssignShiftBreakDefaults(template.id);
                          }}
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
                    })}
                  </View>
                ) : (
                  <Text className="px-1 py-2 text-center font-body text-sm text-muted-foreground">
                    {t("calendar.noShiftTemplates")}
                  </Text>
                )}

                <View className="rounded-[24px] border border-[#e7ecf5] bg-white p-4">
                  <PressableScale
                    className="flex-row items-center gap-3"
                    haptic="selection"
                    onPress={() =>
                      setAssignShiftBreakEnabled((current) => !current)
                    }
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-full border ${
                        assignShiftBreakEnabled
                          ? "border-primary bg-primary"
                          : "border-[#d7deeb] bg-white"
                      }`}
                    >
                      {assignShiftBreakEnabled ? (
                        <Ionicons color="#ffffff" name="checkmark" size={13} />
                      ) : null}
                    </View>
                    <Text className="flex-1 font-body text-[14px] font-semibold text-foreground">
                      {t("calendar.fixedBreak")}
                    </Text>
                  </PressableScale>

                  {assignShiftBreakEnabled ? (
                    <View className="mt-4 gap-3">
                      <View className="flex-row gap-3">
                        <PressableScale
                          className="h-16 justify-center rounded-2xl border border-[#dce4f2] bg-[#f8fbff] px-4"
                          containerClassName="flex-1"
                          haptic="selection"
                          onPress={() => setAssignShiftBreakPickerVisible(true)}
                        >
                          <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                            {t("calendar.fixedBreakStart")}
                          </Text>
                          <Text className="mt-1 font-display text-[18px] font-extrabold leading-6 text-foreground">
                            {formatLocalTime(assignShiftBreakStartsAt)}
                          </Text>
                        </PressableScale>
                        <PressableScale
                          className="h-16 justify-center rounded-2xl border border-[#dce4f2] bg-[#f8fbff] px-4"
                          containerClassName="flex-1"
                          haptic="selection"
                          onPress={() =>
                            setAssignShiftBreakDurationPickerVisible(true)
                          }
                        >
                          <Text className="font-body text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-[#8a96ab]">
                            {t("calendar.fixedBreakDuration")}
                          </Text>
                          <Text className="mt-1 font-display text-[18px] font-extrabold leading-6 text-foreground">
                            {formatBreakDurationLabel(
                              assignShiftBreakDurationMinutes,
                              language,
                            )}
                          </Text>
                        </PressableScale>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </ScrollView>

          <View className={BOTTOM_SHEET_ACTION_ROW_CLASS}>
            <View className="flex-1">
              <Button
                className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-[#dce4f2] bg-white`}
                fullWidth
                label={t("profile.cancel")}
                onPress={() => {
                  setAssignShiftSheetVisible(false);
                  setEditingShiftId(null);
                  setTemplateComposerVisible(false);
                  setTemplateTimePickerTarget(null);
                  setTemplateBreakDurationPickerVisible(false);
                  setAssignShiftBreakPickerVisible(false);
                  setAssignShiftBreakDurationPickerVisible(false);
                }}
                textClassName="text-foreground"
                variant="secondary"
              />
            </View>
            <View className="flex-1">
              <Button
                className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-transparent bg-[#315cf6] shadow-sm shadow-[#315cf6]/25`}
                disabled={
                  assignShiftSubmitting ||
                  assignShiftEmployeeIds.length === 0 ||
                  !assignShiftTemplateId ||
                  !canAssignShiftForSelectedDay
                }
                fullWidth
                label={
                  assignShiftSubmitting
                    ? t("common.processing")
                    : editingShiftId
                      ? t("calendar.saveShiftChanges")
                      : t("calendar.assignShiftSave")
                }
                onPress={() => {
                  void submitManagerShiftAssignment();
                }}
                textClassName="text-white"
              />
            </View>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setOverdueSheetVisible(false)}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={!isManager && overdueSheetVisible}
      >
        <View
          className="gap-4 px-5 pt-8"
          style={{ maxHeight: overdueSheetMaxHeight }}
        >
          <Text className="text-center text-[26px] font-extrabold text-foreground">
            {t("calendar.overdueSheetTitle")}
          </Text>
          <Text className="text-center text-[15px] leading-6 text-muted-foreground">
            {t("calendar.overdueSheetBody")}
          </Text>

          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingBottom: overdueListBottomPadding }}
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
          >
            <View className="gap-3">
              {overdueTaskGroups.length > 0 ? (
                overdueTaskGroups.map((group) => (
                  <View
                    className="overflow-hidden rounded-[26px] border border-[#e7edf7] bg-white/88"
                    key={group.id}
                  >
                    <View className="flex-row items-center justify-between gap-3 bg-[#f8fbff] px-4 py-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="font-display text-[17px] font-extrabold text-foreground"
                          numberOfLines={1}
                        >
                          {group.title}
                        </Text>
                      </View>
                      <View className="rounded-full bg-[#fff4dd] px-3 py-1">
                        <Text className="font-body text-[11px] font-extrabold text-[#c17b07]">
                          {t("calendar.overdueGroupCount", {
                            count: group.tasks.length,
                          })}
                        </Text>
                      </View>
                    </View>

                    <View>
                      {group.tasks.map((item, index) => {
                        const avatarKey = item.employeeId ?? item.task.id;
                        const showAvatar =
                          item.avatarSource &&
                          !failedAvatarEmployeeIds.has(avatarKey);

                        return (
                          <View
                            className={`px-4 py-4 ${
                              index < group.tasks.length - 1
                                ? "border-b border-[#edf1f7]"
                                : ""
                            }`}
                            key={item.task.id}
                          >
                            <View className="flex-row items-start gap-3">
                              {showAvatar ? (
                                <Image
                                  className="mt-0.5 h-11 w-11 rounded-2xl"
                                  onError={() => markAvatarFailed(avatarKey)}
                                  resizeMode="cover"
                                  source={item.avatarSource}
                                />
                              ) : item.employeeId ? (
                                <Image
                                  className="mt-0.5 h-11 w-11 rounded-2xl bg-[#eef2ff]"
                                  resizeMode="cover"
                                  source={resolveEmployeeAvatarSource({
                                    firstName: item.firstName,
                                    id: item.employeeId,
                                    lastName: item.lastName,
                                  })}
                                />
                              ) : (
                                <View className="mt-0.5 h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4dd]">
                                  <Ionicons
                                    color="#c17b07"
                                    name="people-outline"
                                    size={20}
                                  />
                                </View>
                              )}

                              <View className="min-w-0 flex-1">
                                <View className="flex-row items-start gap-2">
                                  <Text
                                    className="min-w-0 flex-1 font-body text-[16px] font-semibold leading-6 text-foreground"
                                    numberOfLines={2}
                                  >
                                    {item.title}
                                  </Text>
                                  {item.photoCount > 0 ? (
                                    <PressableScale
                                      className="mt-0.5 flex-row items-center gap-1 rounded-full bg-[#eef3ff] px-2 py-1"
                                      haptic="selection"
                                      onPress={() => openTaskPhotos(item.task)}
                                    >
                                      <Ionicons
                                        color="#315cf6"
                                        name="images-outline"
                                        size={13}
                                      />
                                      <Text className="font-body text-[11px] font-extrabold text-[#315cf6]">
                                        {item.photoCount}
                                      </Text>
                                    </PressableScale>
                                  ) : null}
                                </View>

                                {item.subtitle ? (
                                  <Text
                                    className="mt-1 font-body text-sm leading-6 text-muted-foreground"
                                    numberOfLines={2}
                                  >
                                    {item.subtitle}
                                  </Text>
                                ) : null}

                                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                                  <Text
                                    className="max-w-[58%] font-body text-xs font-semibold text-[#7b8798]"
                                    numberOfLines={1}
                                  >
                                    {item.employeeName}
                                  </Text>
                                  <Text className="font-body text-xs font-semibold text-[#c17b07]">
                                    {t("calendar.overdueFrom", {
                                      dateLabel: item.dateLabel,
                                    })}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {renderOverdueTaskActions(item.task, true)}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
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
          style={{ paddingBottom: bottomSheetActionBottomOffset }}
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
                <View className="mt-2 w-full items-center overflow-hidden">
                  <DateTimePicker
                    display="spinner"
                    minimumDate={todayStart}
                    mode="date"
                    onChange={handleRescheduleDateChange}
                    style={[
                      styles.rescheduleDatePickerSpinner,
                      { width: rescheduleDatePickerWidth },
                    ]}
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

          <View className={BOTTOM_SHEET_ACTION_ROW_CLASS}>
            <View className="flex-1">
              <Button
                className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-[#fecdd3] bg-[#fff1f2]`}
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
                className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-transparent bg-[#315cf6] shadow-sm shadow-[#315cf6]/25`}
                fullWidth
                label={
                  pendingTaskAction === "reschedule"
                    ? t("common.processing")
                    : t("calendar.saveNewDate")
                }
                onPress={() => {
                  void submitTaskReschedule();
                }}
                textClassName="text-white"
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </BottomSheetModal>

      <TimeWheelPicker
        initialValue={
          templateTimePickerTarget === "break"
            ? templateDraft.fixedBreakStartsAt
            : templateTimePickerTarget === "end"
              ? templateDraft.endsAt
              : templateDraft.startsAt
        }
        onApply={(value) => {
          setTemplateDraft((current) =>
            templateTimePickerTarget === "break"
              ? { ...current, fixedBreakStartsAt: value }
              : templateTimePickerTarget === "end"
                ? { ...current, endsAt: value }
                : { ...current, startsAt: value },
          );
          setTemplateTimePickerTarget(null);
        }}
        onClose={() => setTemplateTimePickerTarget(null)}
        title={
          templateTimePickerTarget === "break"
            ? t("calendar.fixedBreakStart")
            : templateTimePickerTarget === "end"
              ? t("calendar.shiftTemplateEnd")
              : t("calendar.shiftTemplateStart")
        }
        visible={Boolean(templateTimePickerTarget)}
      />

      <TimeWheelPicker
        initialValue={durationStringToTimeValue(
          templateDraft.fixedBreakDurationMinutes,
        )}
        onApply={(value) => {
          setTemplateDraft((current) => ({
            ...current,
            fixedBreakDurationMinutes: timeValueToDurationMinutes(value),
          }));
          setTemplateBreakDurationPickerVisible(false);
        }}
        onClose={() => setTemplateBreakDurationPickerVisible(false)}
        title={t("calendar.fixedBreakDuration")}
        visible={templateBreakDurationPickerVisible}
      />

      <TimeWheelPicker
        initialValue={assignShiftBreakStartsAt}
        onApply={(value) => {
          setAssignShiftBreakStartsAt(value);
          setAssignShiftBreakPickerVisible(false);
        }}
        onClose={() => setAssignShiftBreakPickerVisible(false)}
        title={t("calendar.fixedBreakStart")}
        visible={assignShiftBreakPickerVisible}
      />

      <TimeWheelPicker
        initialValue={durationStringToTimeValue(assignShiftBreakDurationMinutes)}
        onApply={(value) => {
          setAssignShiftBreakDurationMinutes(timeValueToDurationMinutes(value));
          setAssignShiftBreakDurationPickerVisible(false);
        }}
        onClose={() => setAssignShiftBreakDurationPickerVisible(false)}
        title={t("calendar.fixedBreakDuration")}
        visible={assignShiftBreakDurationPickerVisible}
      />

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
