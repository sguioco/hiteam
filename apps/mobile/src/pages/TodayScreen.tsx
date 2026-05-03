import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../components/ui/text';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AttendanceStatusResponse, TaskItem } from '@smart/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeBannerTheme, useBannerTheme } from '../../lib/banner-theme';
import { getDirectionalIconStyle, useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from '../../lib/screen-cache';
import { formatDateKeyInTimeZone } from '../../lib/timezone';
import { primeTaskTranslations } from '../../lib/use-translated-task-copy';
import { TODAY_SCREEN_CACHE_KEY, TODAY_SCREEN_CACHE_TTL_MS, type TodayScreenCacheValue } from '../../lib/workspace-cache';
import { resolveAttendanceActionHref } from '../../lib/workspace-setup';
import MeetingsList from '../components/MeetingsList';
import ShiftStatusCard from '../components/ShiftStatusCard';
import TaskList from '../components/TaskList';
import { loadTodayBootstrap, updateMyTaskStatus } from '../../lib/api';
import { isTaskMeeting, isTaskOpen, parseTaskDueAt } from '../../lib/task-utils';
import { collapseDuplicateTodayTasks, countOverdueTodayTasks, taskAnchorsDateKey } from '../../lib/today-task-state';

type TodayScreenProps = {
  onOpenOverdue?: () => void;
};
type ShiftItem = TodayScreenCacheValue['shifts'][number];

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toAttendanceShift(shift: ShiftItem) {
  return {
    id: shift.id,
    label: shift.template.name,
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    locationName: shift.location.name,
  };
}

const TodayScreen = ({ onOpenOverdue }: TodayScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const { theme: bannerTheme, setTheme } = useBannerTheme();
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      ),
    [],
  );
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusResponse | null>(
    initialSnapshot?.value.attendanceStatus ?? null,
  );
  const [profile, setProfile] = useState<TodayScreenCacheValue['profile']>(
    initialSnapshot?.value.profile ?? null,
  );
  const [shifts, setShifts] = useState<ShiftItem[]>(initialSnapshot?.value.shifts ?? []);
  const [tasks, setTasks] = useState<TodayScreenCacheValue['tasks']>(initialSnapshot?.value.tasks ?? []);
  const [attendanceLoading, setAttendanceLoading] = useState(!initialSnapshot);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
  const businessTimeZone = profile?.primaryLocation?.timezone ?? null;
  const todayDateKey = useMemo(
    () => formatDateKeyInTimeZone(new Date(), businessTimeZone),
    [businessTimeZone],
  );

  const refreshAttendance = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setAttendanceLoading(true);
    }
    setAttendanceError(null);

    try {
      const now = new Date();
      const businessTimezoneHint = profile?.primaryLocation?.timezone ?? null;
      const previousDateKey = formatDateKeyInTimeZone(
        addDays(now, -1),
        businessTimezoneHint,
      );
      const nextDayDateKey = formatDateKeyInTimeZone(
        addDays(now, 1),
        businessTimezoneHint,
      );
      const todayBootstrap = await loadTodayBootstrap({
        dateFrom: previousDateKey,
        dateTo: nextDayDateKey,
      });
      setAttendanceStatus(todayBootstrap.attendanceStatus);
      setProfile(todayBootstrap.profile);
      setShifts(todayBootstrap.shifts);
      await primeTaskTranslations(todayBootstrap.tasks, language);
      setTasks(todayBootstrap.tasks);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : t('today.loadError'));
    } finally {
      setAttendanceLoading(false);
    }
  }, [language, profile?.primaryLocation?.timezone, t]);

  useEffect(() => {
    return subscribeScreenCache<TodayScreenCacheValue>(
      TODAY_SCREEN_CACHE_KEY,
      (entry) => {
        if (!entry) {
          return;
        }

        void primeTaskTranslations(entry.value.tasks, language).catch(() => undefined);
        setAttendanceStatus(entry.value.attendanceStatus);
        setProfile(entry.value.profile);
        setShifts(entry.value.shifts);
        setTasks(entry.value.tasks);
        setAttendanceLoading(false);
      },
    );
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cached = await readScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      );

      if (cached && !cancelled) {
        void primeTaskTranslations(cached.value.tasks, language).catch(() => undefined);
        setAttendanceStatus(cached.value.attendanceStatus);
        setProfile(cached.value.profile);
        setShifts(cached.value.shifts);
        setTasks(cached.value.tasks);
        setAttendanceLoading(false);

        if (!cached.isStale) {
          return;
        }
      }

      await refreshAttendance({ silent: Boolean(cached ?? initialSnapshot) });
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSnapshot, refreshAttendance]);

  useEffect(() => {
    const hasCachedSnapshot = Boolean(profile || attendanceStatus || shifts.length || tasks.length);

    if (!hasCachedSnapshot || attendanceLoading) {
      return;
    }

    void writeScreenCache(TODAY_SCREEN_CACHE_KEY, {
      attendanceStatus,
      profile,
      shifts,
      tasks,
    } satisfies TodayScreenCacheValue);
  }, [attendanceLoading, attendanceStatus, profile, shifts, tasks]);

  useEffect(() => {
    const remoteBannerTheme = normalizeBannerTheme(profile?.user.bannerTheme);

    if (remoteBannerTheme && remoteBannerTheme !== bannerTheme) {
      setTheme(remoteBannerTheme);
    }
  }, [bannerTheme, profile?.user.bannerTheme, setTheme]);

  const visibleTasks = useMemo(
    () => collapseDuplicateTodayTasks(tasks, businessTimeZone),
    [businessTimeZone, tasks],
  );

  const todayTasks = useMemo(
    () =>
      visibleTasks.filter(
        (task) =>
          !isTaskMeeting(task) &&
          taskAnchorsDateKey(task, todayDateKey, businessTimeZone),
      ),
    [businessTimeZone, todayDateKey, visibleTasks],
  );

  const todayMeetings = useMemo(
    () =>
      visibleTasks.filter(
        (task) =>
          task.status !== 'DONE' &&
          task.status !== 'CANCELLED' &&
          isTaskMeeting(task) &&
          taskAnchorsDateKey(task, todayDateKey, businessTimeZone),
      ),
    [businessTimeZone, todayDateKey, visibleTasks],
  );

  const overdueCount = useMemo(() => {
    return countOverdueTodayTasks(visibleTasks, todayDateKey, businessTimeZone);
  }, [businessTimeZone, todayDateKey, visibleTasks]);

  const effectiveAttendanceStatus = useMemo<AttendanceStatusResponse | null>(() => {
    if (!attendanceStatus) {
      return null;
    }

    const now = Date.now();
    const hasLiveAttendanceSession =
      attendanceStatus.attendanceState === 'checked_in' || attendanceStatus.attendanceState === 'on_break';
    const sortedShifts = shifts
      .slice()
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
    const activeScheduledShift =
      sortedShifts.find((shift) => {
        const startsAt = new Date(shift.startsAt).getTime();
        const endsAt = new Date(shift.endsAt).getTime();
        return now >= startsAt && now <= endsAt;
      }) ?? null;
    const nextScheduledShift =
      sortedShifts.find((shift) => {
        const startsAt = new Date(shift.startsAt).getTime();
        return startsAt > now;
      }) ?? null;
    const apiShiftEnd = attendanceStatus.shift ? new Date(attendanceStatus.shift.endsAt).getTime() : null;
    const apiShiftIsStillRelevant = Boolean(attendanceStatus.shift && apiShiftEnd && (hasLiveAttendanceSession || apiShiftEnd > now));

    if (apiShiftIsStillRelevant) {
      return {
        ...attendanceStatus,
        nextShift: attendanceStatus.nextShift ?? (nextScheduledShift ? toAttendanceShift(nextScheduledShift) : null),
      };
    }

    if (activeScheduledShift) {
      return {
        ...attendanceStatus,
        shift: toAttendanceShift(activeScheduledShift),
        nextShift: nextScheduledShift ? toAttendanceShift(nextScheduledShift) : attendanceStatus.nextShift,
      };
    }

    if (nextScheduledShift) {
      return {
        ...attendanceStatus,
        shift: null,
        nextShift: toAttendanceShift(nextScheduledShift),
      };
    }

    return attendanceStatus;
  }, [attendanceStatus, shifts]);

  function openAttendanceAction() {
    if (!effectiveAttendanceStatus) {
      return;
    }

    if (
      (effectiveAttendanceStatus.attendanceState === 'not_checked_in' ||
        (effectiveAttendanceStatus.workMode === 'FIELD' &&
          effectiveAttendanceStatus.attendanceState === 'checked_out')) &&
      effectiveAttendanceStatus.allowedActions.includes('check_in')
    ) {
      router.push(resolveAttendanceActionHref('check-in'));
      return;
    }

    if (
      (effectiveAttendanceStatus.attendanceState === 'checked_in' ||
        effectiveAttendanceStatus.attendanceState === 'on_break') &&
      effectiveAttendanceStatus.allowedActions.includes('check_out')
    ) {
      router.push(resolveAttendanceActionHref('check-out'));
    }
  }

  function openBreakAction() {
    if (!effectiveAttendanceStatus) {
      return;
    }

    if (effectiveAttendanceStatus.allowedActions.includes('start_break')) {
      router.push(resolveAttendanceActionHref('break/start'));
      return;
    }

    if (effectiveAttendanceStatus.allowedActions.includes('end_break')) {
      router.push(resolveAttendanceActionHref('break/end'));
    }
  }

  async function handleToggleTask(taskId: string, nextStatus: 'TODO' | 'DONE') {
    if (updatingTaskIds.includes(taskId)) {
      return;
    }

    setTaskError(null);
    setUpdatingTaskIds((current) => [...current, taskId]);

    let previousTask: (typeof tasks)[number] | undefined;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        previousTask = task;
        return {
          ...task,
          status: nextStatus,
          completedAt: nextStatus === 'DONE' ? new Date().toISOString() : null,
        };
      }),
    );

    try {
      const updatedTask = await updateMyTaskStatus(taskId, nextStatus);
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
    } catch (error) {
      if (previousTask) {
        setTasks((current) => current.map((task) => (task.id === taskId ? previousTask! : task)));
      }
      setTaskError(error instanceof Error ? error.message : t('today.loadError'));
    } finally {
      setUpdatingTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  function handleTaskUpdate(updatedTask: (typeof tasks)[number]) {
    setTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  }

  const showLoadingState = attendanceLoading && !initialSnapshot && !profile && !attendanceStatus && shifts.length === 0 && tasks.length === 0;

  return (
    <>
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <View style={{ marginHorizontal: -16 }}>
            <ShiftStatusCard
              displayTimeZone={businessTimeZone}
              greetingName={profile?.firstName ?? null}
              loading={showLoadingState}
              onBreakAction={openBreakAction}
              onPrimaryAction={openAttendanceAction}
              status={effectiveAttendanceStatus}
              topInset={insets.top}
            />
          </View>

          <View className="px-4">
            {attendanceError ? (
              <View className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm leading-6 text-danger">{attendanceError}</Text>
              </View>
            ) : null}
            {taskError ? (
              <View className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm leading-6 text-danger">{taskError}</Text>
              </View>
            ) : null}

            {overdueCount > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(180).withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
              >
                <Pressable
                  className="mb-4 flex-row items-center gap-3 rounded-2xl border border-warning/30 bg-white/70 px-4 py-3 shadow-sm shadow-[#1f2687]/10"
                  onPress={() => {
                    hapticSelection();
                    onOpenOverdue?.();
                  }}
                >
                  <Ionicons color="#f59e0b" name="warning-outline" size={20} />
                  <Text className="flex-1 font-body text-sm text-foreground">
                    {t('today.overdueBanner', { count: overdueCount })}
                  </Text>
                  <Ionicons color="#f59e0b" name="chevron-forward" size={16} style={directionalIconStyle} />
                </Pressable>
              </Animated.View>
            ) : null}

            <TaskList
              loading={showLoadingState}
              onTaskUpdate={handleTaskUpdate}
              onToggleTask={handleToggleTask}
              tasks={todayTasks}
              updatingTaskIds={updatingTaskIds}
            />
            {showLoadingState || todayMeetings.length > 0 ? (
              <MeetingsList loading={showLoadingState} tasks={todayMeetings} />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default TodayScreen;

