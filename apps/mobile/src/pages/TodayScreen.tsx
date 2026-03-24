import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AttendanceStatusResponse } from '@smart/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';
import MeetingsList from '../components/MeetingsList';
import ShiftStatusCard from '../components/ShiftStatusCard';
import TaskList from '../components/TaskList';
import { loadAttendanceStatus, loadMyProfile, loadMyShifts, loadMyTasks, updateMyTaskStatus } from '../../lib/api';
import { isTaskMeeting, isTaskOpen, parseTaskDueAt, startOfDay, taskDueToday } from '../../lib/task-utils';

type TodayScreenProps = {
  onOpenOverdue?: () => void;
};
type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const { t } = useI18n();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusResponse | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof loadMyProfile>> | null>(null);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof loadMyTasks>>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);

  async function refreshAttendance() {
    setAttendanceLoading(true);
    setAttendanceError(null);

    try {
      const [nextStatus, nextProfile, nextShifts, nextTasks] = await Promise.all([
        loadAttendanceStatus(),
        loadMyProfile(),
        loadMyShifts(),
        loadMyTasks({ date: formatDateKey(new Date()) }),
      ]);
      setAttendanceStatus(nextStatus);
      setProfile(nextProfile);
      setShifts(nextShifts);
      setTasks(nextTasks);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : t('today.loadError'));
    } finally {
      setAttendanceLoading(false);
    }
  }

  useEffect(() => {
    void refreshAttendance();
  }, []);

  const todayTasks = useMemo(
    () => tasks.filter((task) => !isTaskMeeting(task) && taskDueToday(task)),
    [tasks],
  );

  const todayMeetings = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== 'DONE' && task.status !== 'CANCELLED' && isTaskMeeting(task) && taskDueToday(task),
      ),
    [tasks],
  );

  const overdueCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return tasks.filter((task) => {
      if (!isTaskOpen(task.status)) {
        return false;
      }

      const dueAt = parseTaskDueAt(task);
      return Boolean(dueAt && startOfDay(dueAt).getTime() < todayStart.getTime());
    }).length;
  }, [tasks]);

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
    if (!effectiveAttendanceStatus?.shift) {
      return;
    }

    if (effectiveAttendanceStatus.attendanceState === 'not_checked_in') {
      router.push('/say-hi' as never);
      return;
    }

    if (effectiveAttendanceStatus.attendanceState === 'checked_in' || effectiveAttendanceStatus.attendanceState === 'on_break') {
      router.push('/say-bye' as never);
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
              greetingName={profile?.firstName ?? null}
              loading={attendanceLoading}
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
                  <Ionicons color="#f59e0b" name="chevron-forward" size={16} />
                </Pressable>
              </Animated.View>
            ) : null}

            <TaskList
              loading={attendanceLoading}
              onTaskUpdate={handleTaskUpdate}
              onToggleTask={handleToggleTask}
              tasks={todayTasks}
              updatingTaskIds={updatingTaskIds}
            />
            {attendanceLoading || todayMeetings.length > 0 ? (
              <MeetingsList loading={attendanceLoading} tasks={todayMeetings} />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default TodayScreen;
