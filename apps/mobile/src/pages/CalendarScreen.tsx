import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TaskItem } from '@smart/types';
import BottomSheetModal from '../components/BottomSheetModal';
import { TimeWheelPicker, type TimeValue } from '../components/TimeWheelPicker';
import { loadMyShifts, loadMyTasks, rescheduleMyTask, updateMyTaskStatus } from '../../lib/api';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { parseTaskMeta } from '../../lib/task-meta';
import { isTaskMeeting, isTaskOpen, parseTaskDueAt } from '../../lib/task-utils';
import { primeTaskTranslations, useTranslatedTaskCopy } from '../../lib/use-translated-task-copy';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Button } from '../../components/ui/button';

type CalendarDayItem = {
  id: string;
  task: TaskItem;
  title: string;
  kind: 'task' | 'meeting';
  note: string;
  status: 'done' | 'planned' | 'cancelled' | 'overdue';
};

type CalendarScreenProps = {
  active?: boolean;
  overdueSheetSignal?: number;
};

const CALENDAR_SCREEN_CACHE_TTL_MS = 5 * 60_000;

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
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
  return Boolean(dueAt && startOfDay(dueAt).getTime() < startOfDay(referenceDate).getTime());
}

export default function CalendarScreen({ active = true, overdueSheetSignal = 0 }: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, t, tp } = useI18n();
  const locale = getDateLocale(language);
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthAnimationDirection, setMonthAnimationDirection] = useState<'next' | 'prev'>('next');
  const [overdueSheetVisible, setOverdueSheetVisible] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTaskAction, setPendingTaskAction] = useState<'done' | 'delete' | 'reschedule' | null>(null);
  const [rescheduleTaskItem, setRescheduleTaskItem] = useState<TaskItem | null>(null);
  const [rescheduleSheetVisible, setRescheduleSheetVisible] = useState(false);
  const [rescheduleDatePickerVisible, setRescheduleDatePickerVisible] = useState(false);
  const [rescheduleDateValue, setRescheduleDateValue] = useState(() => startOfDay(today));
  const [rescheduleTimeValue, setRescheduleTimeValue] = useState<TimeValue>(() => ({
    hour: today.getHours(),
    minute: today.getMinutes(),
  }));
  const [rescheduleTimePickerVisible, setRescheduleTimePickerVisible] = useState(false);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthKey = `${year}-${monthIndex}`;
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const month = currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
  const calendarCacheKey = `calendar-screen:${year}-${monthIndex}`;
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<{
        shifts: Awaited<ReturnType<typeof loadMyShifts>>;
        tasks: Awaited<ReturnType<typeof loadMyTasks>>;
      }>(calendarCacheKey, CALENDAR_SCREEN_CACHE_TTL_MS),
    [calendarCacheKey],
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Awaited<ReturnType<typeof loadMyShifts>>>(initialSnapshot?.value.shifts ?? []);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof loadMyTasks>>>(initialSnapshot?.value.tasks ?? []);
  const { getTaskBody, getTaskMeetingLocation, getTaskTitle } =
    useTranslatedTaskCopy(tasks, language);
  const isCurrentMonth = year === today.getFullYear() && monthIndex === today.getMonth();
  const selectedDate = new Date(year, monthIndex, selectedDay);
  const selectedDayKey = formatDateKey(selectedDate);
  const todayStart = useMemo(() => startOfDay(today), [today]);

  useEffect(() => {
    return subscribeScreenCache<{
      shifts: Awaited<ReturnType<typeof loadMyShifts>>;
      tasks: Awaited<ReturnType<typeof loadMyTasks>>;
    }>(calendarCacheKey, (entry) => {
      if (!entry) {
        return;
      }

      setShifts(entry.value.shifts);
      setTasks(entry.value.tasks);
      setLoading(false);
    });
  }, [calendarCacheKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const cached = await readScreenCache<{
        shifts: Awaited<ReturnType<typeof loadMyShifts>>;
        tasks: Awaited<ReturnType<typeof loadMyTasks>>;
      }>(calendarCacheKey, CALENDAR_SCREEN_CACHE_TTL_MS);

      if (cached && !cancelled) {
        setShifts(cached.value.shifts);
        setTasks(cached.value.tasks);
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
        const [nextShifts, nextTasks] = await Promise.all([
          loadMyShifts(),
          loadMyTasks({
            dateFrom: formatDateKey(rangeStart),
            dateTo: formatDateKey(rangeEnd),
          }),
        ]);

        if (!cancelled) {
          await primeTaskTranslations(nextTasks, language);
          setShifts(nextShifts);
          setTasks(nextTasks);
          void writeScreenCache(calendarCacheKey, {
            shifts: nextShifts,
            tasks: nextTasks,
          });
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('today.loadError'));
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
  }, [calendarCacheKey, initialSnapshot, language, monthIndex, t, year]);

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
    return weekday.toLocaleString(locale, { weekday: 'short' });
  });

  const shiftByDateKey = useMemo(() => {
    const map = new Map<string, Awaited<ReturnType<typeof loadMyShifts>>[number]>();

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
        title: getTaskTitle(task, { normalize: true }),
        kind: isTaskMeeting(task) ? 'meeting' : 'task',
        note:
          getTaskMeetingLocation(task) ||
          meta.meeting?.meetingLink ||
          getTaskBody(task) ||
          dueAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        status: task.status === 'DONE' ? 'done' : task.status === 'CANCELLED' ? 'cancelled' : overdue ? 'overdue' : 'planned',
      });
      map.set(key, nextItems);
    });

    return map;
  }, [getTaskBody, getTaskMeetingLocation, getTaskTitle, locale, tasks, today]);

  const eventDays = useMemo(() => {
    const days = new Set<number>();

    Array.from(shiftByDateKey.keys()).forEach((key) => {
      const [itemYear, itemMonth, itemDay] = key.split('-').map(Number);
      if (itemYear === year && itemMonth === monthIndex + 1) {
        days.add(itemDay);
      }
    });

    Array.from(itemsByDateKey.keys()).forEach((key) => {
      const [itemYear, itemMonth, itemDay] = key.split('-').map(Number);
      if (itemYear === year && itemMonth === monthIndex + 1) {
        days.add(itemDay);
      }
    });

    return days;
  }, [itemsByDateKey, monthIndex, shiftByDateKey, year]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((task) => isOverdueTask(task, today))
      .sort((left, right) => {
        const leftDueAt = parseTaskDueAt(left)?.getTime() ?? Infinity;
        const rightDueAt = parseTaskDueAt(right)?.getTime() ?? Infinity;
        return leftDueAt - rightDueAt;
      });
  }, [tasks, today]);

  const selectedShift = shiftByDateKey.get(selectedDayKey) ?? null;
  const selectedItems = itemsByDateKey.get(selectedDayKey) ?? [];
  const selectedTaskCount = selectedItems.filter((item) => item.kind === 'task').length;
  const selectedMeetingCount = selectedItems.filter((item) => item.kind === 'meeting').length;
  const selectedSummaryText =
    selectedTaskCount > 0 && selectedMeetingCount > 0
      ? t('calendar.countSummary', {
        tasks: tp(selectedTaskCount, ['задача', 'задачи', 'задач'], ['task', 'tasks']),
        meetings: tp(selectedMeetingCount, ['встреча', 'встречи', 'встреч'], ['meeting', 'meetings']),
      })
      : selectedTaskCount > 0
        ? tp(selectedTaskCount, ['задача', 'задачи', 'задач'], ['task', 'tasks'])
        : selectedMeetingCount > 0
          ? tp(selectedMeetingCount, ['встреча', 'встречи', 'встреч'], ['meeting', 'meetings'])
          : null;

  const selectedDayRelation =
    startOfDay(selectedDate).getTime() < todayStart.getTime()
      ? 'past'
      : startOfDay(selectedDate).getTime() > todayStart.getTime()
        ? 'future'
        : 'today';

  const selectedDayLabel = selectedDate.toLocaleString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const rescheduleActionsOffset = 15;

  function changeMonth(offset: number) {
    hapticSelection();
    setMonthAnimationDirection(offset > 0 ? 'next' : 'prev');
    setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
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

    const initialDate = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
    const initialDateTime = new Date(initialDate);
    initialDateTime.setHours(sourceDueAt.getHours(), sourceDueAt.getMinutes(), 0, 0);

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

  function handleRescheduleDateChange(event: DateTimePickerEvent, pickedDate?: Date) {
    if (Platform.OS === 'android') {
      setRescheduleDatePickerVisible(false);
    }

    if (event.type === 'dismissed' || !pickedDate) {
      return;
    }

    setRescheduleDateValue(startOfDay(pickedDate));
  }

  function syncTaskInState(updatedTask: TaskItem, replacedTaskId?: string | null) {
    setTasks((current) => {
      const next = replacedTaskId ? current.filter((task) => task.id !== replacedTaskId) : [...current];
      const existingIndex = next.findIndex((task) => task.id === updatedTask.id);

      if (existingIndex >= 0) {
        next[existingIndex] = updatedTask;
        return next;
      }

      return [updatedTask, ...next];
    });
  }

  async function markTaskDone(taskId: string) {
    setPendingTaskId(taskId);
    setPendingTaskAction('done');
    setError(null);

    try {
      const updatedTask = await updateMyTaskStatus(taskId, 'DONE');
      syncTaskInState(updatedTask);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('today.taskUpdateError'));
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  async function deleteTask(taskId: string) {
    setPendingTaskId(taskId);
    setPendingTaskAction('delete');
    setError(null);

    try {
      const updatedTask = await updateMyTaskStatus(taskId, 'CANCELLED');
      syncTaskInState(updatedTask);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('today.taskUpdateError'));
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  async function submitTaskReschedule() {
    if (!rescheduleTaskItem) {
      return;
    }

    const nextDueAt = combineDateAndTime(rescheduleDateValue, rescheduleTimeValue);
    if (nextDueAt.getTime() <= Date.now()) {
      setError(t('calendar.moveToAnotherDayHint'));
      return;
    }

    setPendingTaskId(rescheduleTaskItem.id);
    setPendingTaskAction('reschedule');
    setError(null);

    try {
      const result = await rescheduleMyTask(rescheduleTaskItem.id, nextDueAt.toISOString());
      syncTaskInState(result.task, result.replacedTaskId);
      setRescheduleSheetVisible(false);
      setRescheduleDatePickerVisible(false);
      setRescheduleTimePickerVisible(false);
      setRescheduleTaskItem(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('today.taskUpdateError'));
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  function renderOverdueTaskActions(task: TaskItem, includeOpenTaskDay = false) {
    const isPendingForTask = pendingTaskId === task.id;

    return (
      <View className="mt-4 gap-2">
        <View className="flex-row gap-2">
          <Button
            className="min-h-11 flex-1 border-[#dce4f2] bg-white"
            disabled={isPendingForTask}
            label={isPendingForTask && pendingTaskAction === 'reschedule' ? t('common.processing') : t('calendar.rescheduleTask')}
            onPress={() => openRescheduleSheet(task)}
            textClassName="text-[13px] text-foreground"
            variant="secondary"
          />
          {includeOpenTaskDay ? (
            <Button
              className="min-h-11 flex-1 border-[#dce4f2] bg-white"
              disabled={isPendingForTask}
              label={t('calendar.openTaskDay')}
              onPress={() => openTaskDay(task)}
              textClassName="text-[13px] text-foreground"
              variant="secondary"
            />
          ) : null}
          <PressableScale
            className={`min-h-11 min-w-11 items-center justify-center rounded-2xl border px-3 ${
              isPendingForTask && pendingTaskAction === 'delete'
                ? 'border-[#fecdd3] bg-[#fff1f2] opacity-60'
                : 'border-[#fecdd3] bg-[#fff1f2]'
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
              isPendingForTask && pendingTaskAction === 'done'
                ? 'border-[#bbf7d0] bg-[#ecfdf3] opacity-60'
                : 'border-[#bbf7d0] bg-[#ecfdf3]'
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
        {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{ paddingBottom: 112, paddingHorizontal: 16, paddingTop: insets.top + 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
            <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
              <View className="mb-5 flex-row items-center justify-between">
                <PressableScale className="rounded-xl p-2" haptic="selection" onPress={() => changeMonth(-1)}>
                  <Ionicons color="#27364b" name="chevron-back" size={20} />
                </PressableScale>
                <View className="min-w-[140px] overflow-hidden">
                  <Animated.Text
                    entering={
                      monthAnimationDirection === 'next'
                        ? FadeInRight.duration(190).withInitialValues({
                            opacity: 0,
                            transform: [{ translateX: 10 }],
                          })
                        : FadeInLeft.duration(190).withInitialValues({
                            opacity: 0,
                            transform: [{ translateX: -10 }],
                          })
                    }
                    exiting={monthAnimationDirection === 'next' ? FadeOutLeft.duration(170) : FadeOutRight.duration(170)}
                    key={monthKey}
                    className="text-center font-display text-base font-semibold text-foreground"
                  >
                    {month}
                  </Animated.Text>
                </View>
                <PressableScale className="rounded-xl p-2" haptic="selection" onPress={() => changeMonth(1)}>
                  <Ionicons color="#27364b" name="chevron-forward" size={20} />
                </PressableScale>
              </View>

              <View className="overflow-hidden">
                <Animated.View
                  entering={
                    monthAnimationDirection === 'next'
                      ? FadeInRight.duration(190).withInitialValues({
                          opacity: 0,
                          transform: [{ translateX: 14 }],
                        })
                      : FadeInLeft.duration(190).withInitialValues({
                          opacity: 0,
                          transform: [{ translateX: -14 }],
                        })
                  }
                  exiting={monthAnimationDirection === 'next' ? FadeOutLeft.duration(170) : FadeOutRight.duration(170)}
                  key={monthKey}
                >
                  <View className="mb-2 flex-row flex-wrap">
                    {weekdayLabels.map((day) => (
                      <View key={day} className="mb-2 items-center justify-center" style={{ width: '14.28%' }}>
                        <Text className="py-1 text-center font-body text-xs font-medium text-muted-foreground">{day}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row flex-wrap">
                    {cells.map((day, index) => (
                      <View key={`${day}-${index}`} className="mb-2 items-center justify-center" style={{ width: '14.28%' }}>
                        {day !== null ? (
                          <PressableScale
                            className="h-10 w-10 items-center justify-center rounded-full"
                            contentStyle={[
                              day === selectedDay
                                ? {
                                    backgroundColor: '#6d73ff',
                                    borderRadius: 999,
                                    shadowColor: '#6d73ff',
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 3,
                                  }
                                : null,
                              day !== selectedDay && isCurrentMonth && day === today.getDate()
                                ? { backgroundColor: 'rgba(109, 115, 255, 0.15)', borderRadius: 999 }
                                : null,
                            ]}
                            haptic="selection"
                            onPress={() => setSelectedDay(day)}
                          >
                            <Text className="font-body text-sm font-medium" style={{ color: day === selectedDay ? '#ffffff' : '#111827' }}>
                              {day}
                            </Text>
                            <View className="mt-0.5 h-1 w-1 rounded-full bg-primary" style={{ opacity: eventDays.has(day) ? 1 : 0 }} />
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
                <Text className="font-body text-[14px] leading-6 text-danger">{error}</Text>
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
                    <Ionicons color="#f59e0b" name="warning-outline" size={22} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-lg font-bold text-foreground">{t('calendar.overdueManagerTitle', { count: overdueTasks.length })}</Text>
                    <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">{t('calendar.overdueManagerBody')}</Text>
                  </View>
                  <Ionicons color="#f59e0b" name="chevron-forward" size={18} />
                </View>
              </PressableScale>
            ) : null}

            <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-display text-xl font-bold text-foreground">{selectedDayLabel}</Text>
                  <Text className="mt-1 font-body text-sm text-muted-foreground">
                    {loading
                      ? t('common.loading')
                      : selectedShift
                        ? `${selectedShift.template.name} · ${new Date(selectedShift.startsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedShift.endsAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
                        : selectedDayRelation === 'past'
                          ? t('calendar.noShiftRecorded')
                          : t('calendar.dayOff')}
                  </Text>
                  {selectedShift ? (
                    <Text className="mt-1 font-body text-sm text-muted-foreground">{selectedShift.location.name}</Text>
                  ) : null}
                </View>
                <Text className="font-body text-xs font-semibold" style={{ color: selectedShift ? '#169c56' : '#6b7280' }}>
                  {selectedShift ? t('calendar.workDay') : t('calendar.dayOff')}
                </Text>
              </View>
            </View>

            <View>
              <View className="mb-3 flex-row items-center justify-between gap-3 px-5">
                <Text className="font-display text-lg font-semibold text-foreground">
                  {selectedDayRelation === 'past' ? t('calendar.activityOnDay') : t('calendar.planForDay')}
                </Text>
                {selectedSummaryText ? (
                  <View className="rounded-full bg-[#eef4ff] px-3 py-1.5">
                    <Text className="font-body text-xs font-semibold text-[#4f6df5]">{selectedSummaryText}</Text>
                  </View>
                ) : null}
              </View>

              {loading ? (
                <View className="rounded-2xl border border-white/30 bg-white/70 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
                  <Text className="font-body text-sm text-muted-foreground">{t('common.loading')}</Text>
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
                            item.kind === 'meeting'
                              ? '#6d73ff'
                              : item.status === 'done'
                                ? '#10b981'
                                : item.status === 'cancelled'
                                  ? '#ef4444'
                                  : item.status === 'overdue'
                                    ? '#ef4444'
                                    : '#10b981'
                          }
                          name={
                            item.kind === 'meeting'
                              ? 'videocam-outline'
                              : item.status === 'done'
                                ? 'checkmark-circle'
                                : item.status === 'cancelled'
                                  ? 'close-circle-outline'
                                  : item.status === 'overdue'
                                    ? 'alert-circle-outline'
                                    : 'clipboard-outline'
                          }
                          size={20}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-body text-[15px] font-medium text-foreground">{item.title}</Text>
                        <Text className="mt-1 font-body text-sm text-muted-foreground">{item.note}</Text>
                      </View>
                      <Text
                        className="font-body text-xs font-semibold"
                        style={{
                          color:
                            item.status === 'done'
                              ? '#169c56'
                              : item.status === 'cancelled'
                                ? '#ef4444'
                                : item.status === 'overdue'
                                  ? '#ef4444'
                                  : '#4f6df5',
                        }}
                      >
                        {item.status === 'done'
                          ? t('calendar.statusDone')
                          : item.status === 'cancelled'
                            ? t('calendar.statusDeleted')
                            : item.status === 'overdue'
                              ? t('calendar.statusOverdue')
                              : item.kind === 'meeting'
                                ? t('calendar.statusMeeting')
                                : t('calendar.statusPlanned')}
                      </Text>
                    </View>
                    {item.kind === 'task' && item.status === 'overdue' ? renderOverdueTaskActions(item.task) : null}
                  </View>
                ))
              ) : (
                <View className="min-h-[120px] items-center justify-start px-6 pt-12">
                  <Text className="text-center font-body text-[15px] font-medium text-[#9aa6b2]">{t('calendar.noItemsForDay')}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        onClose={() => setOverdueSheetVisible(false)}
        sheetClassName="rounded-t-[32px]"
        solidBackground
        visible={overdueSheetVisible}
      >
        <View className="max-h-[72vh] gap-4 px-5 pt-8" style={{ paddingBottom: insets.bottom + 20 }}>
          <Text className="text-center text-[26px] font-extrabold text-foreground">{t('calendar.overdueSheetTitle')}</Text>
          <Text className="text-center text-[15px] leading-6 text-muted-foreground">{t('calendar.overdueSheetBody')}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-2">
              {overdueTasks.length > 0 ? (
                overdueTasks.map((task) => {
                  const dueAt = parseTaskDueAt(task);
                  const subtitle =
                    getTaskBody(task) ||
                    task.description ||
                    t('calendar.waitingForAction');
                  const dateLabel = dueAt
                    ? dueAt.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
                    : t('calendar.noTimeSelected');

                  return (
                    <View key={task.id} className="rounded-[24px] border border-[#e7edf7] bg-white/88 px-4 py-4">
                      <View className="flex-row items-start gap-3">
                        <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4dd]">
                          <Ionicons color="#f59e0b" name="warning-outline" size={20} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-body text-[16px] font-semibold text-foreground">
                            {getTaskTitle(task, { normalize: true })}
                          </Text>
                          <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">{subtitle}</Text>
                          <Text className="mt-2 font-body text-xs font-semibold text-[#c17b07]">
                            {t('calendar.overdueFrom', { dateLabel })}
                          </Text>
                        </View>
                      </View>
                      {renderOverdueTaskActions(task, true)}
                    </View>
                  );
                })
              ) : (
                <View className="rounded-[24px] border border-[#e7edf7] bg-white/88 px-4 py-6">
                  <Text className="text-center font-body text-sm text-muted-foreground">{t('calendar.noOverdueTasks')}</Text>
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
          style={{ paddingBottom: Math.max(insets.bottom + 20 - rescheduleActionsOffset, 4) }}
        >
          <View>
            <Text className="text-center text-[24px] font-extrabold text-foreground">{t('calendar.rescheduleTask')}</Text>
            <Text className="mt-2 text-center text-[15px] leading-6 text-muted-foreground">{t('calendar.rescheduleDescription')}</Text>
          </View>

          {rescheduleTaskItem ? (
            <View className="items-center px-2">
              <Text className="text-center font-body text-[16px] font-semibold text-foreground">
                {getTaskTitle(rescheduleTaskItem, { normalize: true })}
              </Text>
              <Text className="mt-1 text-center font-body text-sm leading-6 text-muted-foreground">
                {t('calendar.moveToAnotherDayHint')}
              </Text>
            </View>
          ) : null}

          <View className="gap-3">
            <View className="items-center">
              <Text className="font-body text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">{t('calendar.date')}</Text>
              {Platform.OS === 'ios' ? (
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
                <PressableScale className="mt-2 min-w-[220px] rounded-[20px] border border-[#dce4f2] bg-[#f8fbff] px-5 py-4" haptic="selection" onPress={() => setRescheduleDatePickerVisible(true)}>
                  <Text className="text-center font-body text-[15px] font-semibold text-foreground">
                    {rescheduleDateValue.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </PressableScale>
              )}
            </View>

            <View className="items-center">
              <Text className="font-body text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">{t('calendar.time')}</Text>
              <PressableScale className="mt-2 min-w-[220px] rounded-[20px] border border-[#dce4f2] bg-[#f8fbff] px-5 py-4" haptic="selection" onPress={() => setRescheduleTimePickerVisible(true)}>
                <Text className="text-center font-body text-[15px] font-semibold text-foreground">
                  {combineDateAndTime(rescheduleDateValue, rescheduleTimeValue).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
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
                label={t('profile.cancel')}
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
                label={pendingTaskAction === 'reschedule' ? t('common.processing') : t('calendar.saveNewDate')}
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

      {Platform.OS === 'android' && rescheduleDatePickerVisible ? (
        <DateTimePicker minimumDate={todayStart} mode="date" onChange={handleRescheduleDateChange} value={rescheduleDateValue} />
      ) : null}

      <TimeWheelPicker
        initialValue={rescheduleTimeValue}
        onApply={(value) => {
          setRescheduleTimeValue(value);
          setRescheduleTimePickerVisible(false);
        }}
        onClose={() => setRescheduleTimePickerVisible(false)}
        title={t('calendar.time')}
        visible={rescheduleTimePickerVisible}
      />
    </>
  );
}
