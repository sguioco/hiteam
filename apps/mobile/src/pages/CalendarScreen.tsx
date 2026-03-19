import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../components/BottomSheetModal';
import type { OverdueTask } from './Index';

const SHIFT_TIME = '09:00 - 18:00';

type DayItem = {
  id: string;
  title: string;
  kind: 'task' | 'meeting';
  status: 'completed' | 'scheduled' | 'overdue' | 'deleted';
  note: string;
};

type FlashMessage = {
  accent: string;
  background: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  durationMs: number;
};

type CalendarScreenProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  overdueTask: OverdueTask;
  onMarkOverdueDone: () => void;
  onDeleteOverdue: () => void;
  onRescheduleOverdue: (resolutionDateLabel: string, resolutionTime: string, selectedDay: number) => void;
};

const CalendarScreen = ({
  onDeleteOverdue,
  onMarkOverdueDone,
  onRescheduleOverdue,
  onSelectDay,
  overdueTask,
  selectedDay,
}: CalendarScreenProps) => {
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [notDoneModalVisible, setNotDoneModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'options' | 'schedule'>('options');
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [monthAnimationDirection, setMonthAnimationDirection] = useState<'next' | 'prev'>('next');
  const now = new Date();
  const today = now.getDate();
  const month = currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthKey = `${year}-${monthIndex}`;
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const isCurrentMonth =
    year === now.getFullYear() && monthIndex === now.getMonth();

  const cells: Array<number | null> = [];
  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const shifts = [10, 11, 12, 13, 14, 17, 18, 19, 20, 21];
  const yesterdayDay = new Date(year, monthIndex, today - 1).getDate();
  const tomorrowDay = new Date(year, monthIndex, today + 1).getDate();
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const weekday = new Date(2026, 0, 5 + index);
    return weekday.toLocaleString(locale, { weekday: 'short' });
  });
  const scheduleDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(year, monthIndex, today + index);
    return {
      day: date.getDate(),
      label: date.toLocaleString(locale, { month: 'short', day: 'numeric' }),
      shortDay: date.toLocaleString(locale, { weekday: 'short' }),
    };
  });
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
  const [selectedRescheduleDay, setSelectedRescheduleDay] = useState<number>(scheduleDays[1]?.day ?? today);
  const [selectedRescheduleLabel, setSelectedRescheduleLabel] = useState<string>(scheduleDays[1]?.label ?? month);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = useState<string>('10:00');
  const selectedDate = new Date(year, monthIndex, selectedDay);
  const selectedDateStart = new Date(year, monthIndex, selectedDay);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDayLabel = selectedDate.toLocaleString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const selectedDayRelation =
    selectedDateStart < todayStart
      ? 'past'
      : selectedDateStart > todayStart
        ? 'future'
        : 'today';

  const dayItemsByDay = useMemo<Record<number, DayItem[]>>(
    () => ({
      [yesterdayDay]: [
        {
          id: 'yesterday-completed-1',
          kind: 'task',
          note: `${t('calendar.statusDone')} • 13:20`,
          status: 'completed',
          title: 'Clean front desk glass',
        },
      ],
      [today]: [
        {
          id: 'today-task-1',
          kind: 'task',
          note: language === 'ru' ? 'Нужно сделать до обеда' : 'Required before lunch',
          status: 'scheduled',
          title: 'Restock guest towels',
        },
        {
          id: 'today-meeting-1',
          kind: 'meeting',
          note: language === 'ru' ? '15 мин в 10:00' : '15 min at 10:00',
          status: 'scheduled',
          title: 'Standup with manager',
        },
      ],
      [tomorrowDay]: [
        {
          id: 'tomorrow-task-1',
          kind: 'task',
          note: t('today.photoProofRequired'),
          status: 'scheduled',
          title: 'Prepare supply room photos',
        },
        {
          id: 'tomorrow-meeting-1',
          kind: 'meeting',
          note: language === 'ru' ? '30 мин в 14:00' : '30 min at 14:00',
          status: 'scheduled',
          title: 'Safety review',
        },
      ],
    }),
    [language, t, today, tomorrowDay, yesterdayDay],
  );

  const selectedDayItems = useMemo(() => {
    const baseItems = [...(dayItemsByDay[selectedDay] ?? [])];

    if (selectedDay === yesterdayDay && overdueTask.status === 'active') {
        baseItems.unshift({
          id: overdueTask.id,
          kind: 'task',
          note: t('calendar.waitingForAction'),
          status: 'overdue',
          title: overdueTask.title,
        });
    }

    if (overdueTask.status === 'rescheduled' && overdueTask.resolutionDateLabel) {
      const targetDate = new Date(`${overdueTask.resolutionDateLabel}, ${year}`);
      if (!Number.isNaN(targetDate.getTime()) && targetDate.getDate() === selectedDay) {
        baseItems.unshift({
          id: `${overdueTask.id}-moved`,
          kind: 'task',
          note: t('calendar.movedFromOverdue', { time: overdueTask.resolutionTime ?? t('calendar.noTimeSelected') }),
          status: 'scheduled',
          title: overdueTask.title,
        });
      }
    }

    return baseItems;
  }, [dayItemsByDay, overdueTask, selectedDay, t, year, yesterdayDay]);
  const selectedTaskCount = selectedDayItems.filter((item) => item.kind === 'task').length;
  const selectedMeetingCount = selectedDayItems.filter((item) => item.kind === 'meeting').length;
  const selectedSummaryText =
    selectedTaskCount > 0 && selectedMeetingCount > 0
      ? t('calendar.countSummary', { tasks: selectedTaskCount, meetings: selectedMeetingCount })
      : selectedTaskCount > 0
        ? t('calendar.tasksOnlySummary', { tasks: selectedTaskCount })
        : selectedMeetingCount > 0
          ? t('calendar.meetingsOnlySummary', { meetings: selectedMeetingCount })
          : null;

  const eventDays = useMemo(() => {
    const baseEventDays = new Set<number>(Object.entries(dayItemsByDay).flatMap(([day, items]) => (items.length > 0 ? [Number(day)] : [])));
    if (overdueTask.status === 'active') {
      baseEventDays.add(yesterdayDay);
    }
    if (overdueTask.status === 'rescheduled' && overdueTask.resolutionDateLabel) {
      const targetDate = new Date(`${overdueTask.resolutionDateLabel}, ${year}`);
      if (!Number.isNaN(targetDate.getTime())) {
        baseEventDays.add(targetDate.getDate());
      }
    }
    return baseEventDays;
  }, [dayItemsByDay, overdueTask, year, yesterdayDay]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setFlashMessage(null);
    }, flashMessage.durationMs);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      onSelectDay(daysInMonth);
    }
  }, [daysInMonth, onSelectDay, selectedDay]);

  function changeMonth(offset: number) {
    hapticSelection();
    setMonthAnimationDirection(offset > 0 ? 'next' : 'prev');
    setCurrentDate((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      const nextDaysInMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      onSelectDay(Math.min(selectedDay, nextDaysInMonth));
      return next;
    });
  }

  function openNotDoneModal() {
    hapticSelection();
    setPickerMode('options');
    setNotDoneModalVisible(true);
  }

  function closeNotDoneModal() {
    hapticSelection();
    setNotDoneModalVisible(false);
    setPickerMode('options');
  }

  function moveToSchedulePicker() {
    hapticSelection();
    setPickerMode('schedule');
  }

  function saveReschedule() {
    hapticSuccess();
    onRescheduleOverdue(selectedRescheduleLabel, selectedRescheduleTime, selectedRescheduleDay);
    setFlashMessage({
      accent: '#4f6df5',
      background: '#eef4ff',
      durationMs: 2000,
      icon: 'calendar-outline',
      text: t('calendar.movedTo', { dateLabel: selectedRescheduleLabel, time: selectedRescheduleTime }),
    });
    closeNotDoneModal();
  }

  function deleteTask() {
    hapticError();
    onDeleteOverdue();
    setFlashMessage({
      accent: '#ef4444',
      background: '#fff1f3',
      durationMs: 1200,
      icon: 'trash-outline',
      text: t('calendar.deletedReported'),
    });
    closeNotDoneModal();
  }

  function markDone() {
    hapticSuccess();
    onMarkOverdueDone();
    setFlashMessage({
      accent: '#10b981',
      background: '#f0fff7',
      durationMs: 2000,
      icon: 'checkmark-circle',
      text: t('calendar.doneOn', { dateLabel: overdueTask.dateLabel }),
    });
  }

  return (
    <>
      <View className="flex-1 bg-[#41e4f6]">
        <StatusBar backgroundColor="transparent" style="dark" translucent />
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
                  exiting={
                    monthAnimationDirection === 'next'
                      ? FadeOutLeft.duration(170)
                      : FadeOutRight.duration(170)
                  }
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
                exiting={
                  monthAnimationDirection === 'next'
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
                      style={{ width: '14.28%' }}
                    >
                      <Text className="py-1 text-center font-body text-xs font-medium text-muted-foreground">{day}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {cells.map((day, index) => (
                    <View
                      key={`${day}-${index}`}
                      className="mb-2 items-center justify-center"
                      style={{ width: '14.28%' }}
                    >
                      {day !== null ? (
                        <PressableScale
                          className="h-10 w-10 items-center justify-center rounded-full"
                          contentStyle={[
                            day === selectedDay
                              ? { backgroundColor: '#6d73ff', borderRadius: 999, shadowColor: '#6d73ff', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
                              : null,
                            day !== selectedDay && isCurrentMonth && day === today ? { backgroundColor: 'rgba(109, 115, 255, 0.15)', borderRadius: 999 } : null,
                          ]}
                          haptic="selection"
                          onPress={() => onSelectDay(day)}
                        >
                          <Text
                            className="font-body text-sm font-medium"
                            style={{ color: day === selectedDay ? '#ffffff' : shifts.includes(day) ? '#16a34a' : '#111827' }}
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

          {flashMessage ? (
            <Animated.View
              entering={FadeInDown.duration(180).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 8 }],
              })}
              className="rounded-3xl p-5 shadow-sm shadow-[#1f2687]/10"
              style={{ backgroundColor: flashMessage.background, borderColor: flashMessage.accent, borderWidth: 1 }}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/80">
                  <Ionicons color={flashMessage.accent} name={flashMessage.icon} size={20} />
                </View>
                <Text className="flex-1 font-display text-base font-semibold" style={{ color: flashMessage.accent }}>
                  {flashMessage.text}
                </Text>
              </View>
            </Animated.View>
          ) : null}

          <View className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-display text-xl font-bold text-foreground">{selectedDayLabel}</Text>
                <Text className="mt-1 font-body text-sm text-muted-foreground">
                  {shifts.includes(selectedDay)
                    ? t('today.shiftCard', { time: SHIFT_TIME })
                    : selectedDayRelation === 'past'
                      ? t('calendar.noShiftRecorded')
                      : t('calendar.dayOff')}
                </Text>
              </View>
              <Text
                className="font-body text-xs font-semibold"
                style={{ color: shifts.includes(selectedDay) ? '#169c56' : '#6b7280' }}
              >
                {shifts.includes(selectedDay) ? t('calendar.workDay') : t('calendar.dayOff')}
              </Text>
            </View>
          </View>

          {selectedDay === yesterdayDay && overdueTask.status === 'active' ? (
            <View className="rounded-3xl border border-[#ffd4a8] bg-[#fffaf2] p-5 shadow-sm shadow-[#1f2687]/10">
              <View className="mb-3 flex-row items-start gap-3">
                <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-[#fff0da]">
                  <Ionicons color="#f59e0b" name="warning-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-lg font-semibold text-foreground">{t('calendar.overdueFrom', { dateLabel: overdueTask.dateLabel })}</Text>
                  <Text className="mt-1 font-body text-[15px] font-semibold text-foreground">{overdueTask.title}</Text>
                  <Text className="mt-2 font-body text-sm leading-6 text-muted-foreground">
                    {overdueTask.description ?? t('calendar.waitingForAction')}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <PressableScale
                  className="flex-1 rounded-[22px] bg-[#eef5ff] px-4 py-3.5"
                  containerClassName="flex-1"
                  haptic="warning"
                  onPress={openNotDoneModal}
                >
                  <Text className="text-center font-display text-[15px] font-semibold text-[#234067]">{t('calendar.notDone')}</Text>
                </PressableScale>
                <PressableScale
                  className="flex-1 rounded-[22px] bg-success px-4 py-3.5"
                  containerClassName="flex-1"
                  haptic="success"
                  onPress={markDone}
                >
                  <Text className="text-center font-display text-[15px] font-semibold text-white">{t('today.taskMarkDone')}</Text>
                </PressableScale>
              </View>
            </View>
          ) : null}

          <View>
            <View className="mb-3 flex-row items-center justify-between gap-3 px-5">
              <Text className="font-display text-lg font-semibold text-foreground">
                {selectedDayRelation === 'past' ? t('calendar.activityOnDay') : t('calendar.planForDay')}
              </Text>
              {selectedSummaryText ? (
                <View className="rounded-full bg-[#eef4ff] px-3 py-1.5">
                  <Text className="font-body text-xs font-semibold text-[#4f6df5]">
                    {selectedSummaryText}
                  </Text>
                </View>
              ) : null}
            </View>
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map((item, index) => (
                <Animated.View
                  entering={FadeInUp.delay(index * 25).duration(170).withInitialValues({
                    opacity: 0,
                    transform: [{ translateY: 8 }],
                  })}
                  key={item.id}
                  layout={LinearTransition.duration(180)}
                  className="mb-2 flex-row items-center justify-between rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                >
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff]">
                    <Ionicons
                      color={
                        item.status === 'overdue'
                          ? '#f59e0b'
                          : item.status === 'deleted'
                            ? '#ef4444'
                            : item.kind === 'meeting'
                              ? '#6d73ff'
                              : '#10b981'
                      }
                      name={
                        item.kind === 'meeting'
                          ? 'videocam-outline'
                          : item.status === 'completed'
                            ? 'checkmark-circle'
                            : item.status === 'deleted'
                              ? 'trash-outline'
                              : item.status === 'overdue'
                                ? 'warning-outline'
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
                        item.status === 'completed'
                          ? '#169c56'
                          : item.status === 'deleted'
                            ? '#ef4444'
                            : item.status === 'overdue'
                              ? '#f59e0b'
                              : '#4f6df5',
                    }}
                  >
                    {item.status === 'completed'
                      ? t('calendar.statusDone')
                      : item.status === 'deleted'
                        ? t('calendar.statusDeleted')
                        : item.status === 'overdue'
                          ? t('calendar.statusOverdue')
                          : item.kind === 'meeting'
                            ? t('calendar.statusMeeting')
                            : t('calendar.statusPlanned')}
                  </Text>
                </Animated.View>
              ))
            ) : (
              <View className="min-h-[120px] items-center justify-start px-6 pt-12">
                <Text className="text-center font-body text-[15px] font-medium text-[#9aa6b2]">
                  {t('calendar.noItemsForDay')}
                </Text>
              </View>
            )}
          </View>
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        onClose={closeNotDoneModal}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={notDoneModalVisible}
      >
              <View className="mb-4 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-display text-[24px] font-bold text-foreground">
                  {pickerMode === 'options' ? t('calendar.taskNotDoneYet') : t('calendar.rescheduleTask')}
                </Text>
                <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                  {pickerMode === 'options'
                    ? t('calendar.notDoneDescription')
                  : t('calendar.rescheduleDescription')}
                </Text>
              </View>
              <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-muted/80" haptic="selection" onPress={closeNotDoneModal}>
                <Ionicons color="#111827" name="close" size={18} />
              </PressableScale>
            </View>

            {pickerMode === 'options' ? (
              <View className="gap-3">
                <PressableScale className="rounded-[26px] border border-white bg-[#edf4ff] px-5 py-5" haptic="selection" onPress={moveToSchedulePicker}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                      <Ionicons color="#4f6df5" name="calendar-outline" size={22} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[17px] font-semibold text-foreground">{t('calendar.moveToAnotherDay')}</Text>
                      <Text className="mt-1 font-body text-sm text-muted-foreground">{t('calendar.moveToAnotherDayHint')}</Text>
                    </View>
                    <Ionicons color="#4f6df5" name="chevron-forward" size={18} />
                  </View>
                </PressableScale>

                <PressableScale className="rounded-[26px] border border-[#ffd7dc] bg-[#fff1f3] px-5 py-5" haptic="error" onPress={deleteTask}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                      <Ionicons color="#ef4444" name="trash-outline" size={22} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[17px] font-semibold text-foreground">{t('calendar.deleteTask')}</Text>
                      <Text className="mt-1 font-body text-sm text-muted-foreground">{t('calendar.deleteTaskHint')}</Text>
                    </View>
                  </View>
                </PressableScale>
              </View>
            ) : (
              <View className="gap-5">
                <View>
                  <Text className="mb-3 font-display text-base font-semibold text-foreground">{t('calendar.date')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3">
                      {scheduleDays.map((dayOption) => {
                        const isSelected = selectedRescheduleDay === dayOption.day;
                        return (
                          <PressableScale
                            key={`${dayOption.label}-${dayOption.day}`}
                            className={`min-w-[88px] rounded-[22px] border px-4 py-3 ${
                              isSelected ? 'border-primary bg-primary' : 'border-white bg-white'
                            }`}
                            haptic="selection"
                            onPress={() => {
                              setSelectedRescheduleDay(dayOption.day);
                              setSelectedRescheduleLabel(dayOption.label);
                            }}
                          >
                            <Text className={`text-center font-body text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {dayOption.shortDay}
                            </Text>
                            <Text className={`mt-1 text-center font-display text-[15px] font-semibold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                              {dayOption.label}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View>
                  <Text className="mb-3 font-display text-base font-semibold text-foreground">{t('calendar.time')}</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {timeSlots.map((time) => {
                      const isSelected = selectedRescheduleTime === time;
                      return (
                        <PressableScale
                          key={time}
                          className={`rounded-full border px-4 py-2.5 ${
                            isSelected ? 'border-primary bg-primary' : 'border-white bg-white'
                          }`}
                          haptic="selection"
                          onPress={() => setSelectedRescheduleTime(time)}
                        >
                          <Text className={`font-display text-[14px] font-semibold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                            {time}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <PressableScale className="flex-1 rounded-[24px] bg-[#eef5ff] px-4 py-4" containerClassName="flex-1" haptic="selection" onPress={() => setPickerMode('options')}>
                    <Text className="text-center font-display text-[16px] font-semibold text-[#234067]">{t('calendar.back')}</Text>
                  </PressableScale>
                  <PressableScale className="flex-1 rounded-[24px] bg-primary px-4 py-4" containerClassName="flex-1" haptic="success" onPress={saveReschedule}>
                    <Text className="text-center font-display text-[16px] font-semibold text-white">{t('calendar.saveNewDate')}</Text>
                  </PressableScale>
                </View>
              </View>
            )}
      </BottomSheetModal>
    </>
  );
};

export default CalendarScreen;
