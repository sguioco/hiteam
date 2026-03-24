import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Screen } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import { createManagerTask, loadManagerEmployees } from '../../lib/api';
import {
  buildDepartmentFallbackGroups,
  type EmployeeOption,
  type GroupMemberOption,
  type GroupOption,
  mergeGroupOptions,
} from '../../lib/manager-group-options';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { SmartMeetingMeta, appendTaskMeta } from '../../lib/task-meta';
import { TimeWheelPicker, type TimeValue } from '../../src/components/TimeWheelPicker';
import BottomSheetModal from '../../src/components/BottomSheetModal';

type Step = 'details' | 'confirm';
type TimeTarget = 'start' | 'end';
type MeetingMode = 'online' | 'offline';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(hour: number, minute: number) {
  return `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
}

function addMinutesToTime(hour: number, minute: number, delta: number): TimeValue {
  const total = hour * 60 + minute + delta;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);

  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
}

function buildDateTime(date: Date, time: TimeValue) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hour, time.minute, 0, 0);
}

function isDateTimeInPast(date: Date, time: TimeValue) {
  return buildDateTime(date, time).getTime() < Date.now();
}

function getEmployeeInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatFullGroupLabel(groupName: string) {
  return `All ${groupName}`;
}

export default function CreateMeetingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ employeeId?: string | string[]; employeeName?: string | string[] }>();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const preselectedEmployeeId = normalizeParam(params.employeeId);
  const preselectedEmployeeName = normalizeParam(params.employeeName);
  const today = useMemo(() => new Date(), []);

  const [step, setStep] = useState<Step>('details');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<MeetingMode>('online');
  const [link, setLink] = useState('');
  const [location, setLocation] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(today));
  const [startTime, setStartTime] = useState<TimeValue>({ hour: 10, minute: 0 });
  const [endTime, setEndTime] = useState<TimeValue | null>(null);
  const [pickerTarget, setPickerTarget] = useState<TimeTarget | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(preselectedEmployeeId ? [preselectedEmployeeId] : []);
  const [participantSheetOpen, setParticipantSheetOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [timeRowWidth, setTimeRowWidth] = useState(0);

  useEffect(() => {
    async function init() {
      const [employeesResult] = await Promise.allSettled([loadManagerEmployees()]);
      const employeeList = employeesResult.status === 'fulfilled' ? employeesResult.value : [];
      const resolvedGroups: GroupOption[] = [];
      const fallbackGroups = buildDepartmentFallbackGroups(employeeList);
      const groupList = mergeGroupOptions(resolvedGroups, fallbackGroups);

      setEmployees(employeeList);
      setGroups(groupList);
      setExpandedGroupIds(groupList.map((group) => group.id));

      setLoading(false);
    }

    void init();
  }, [t]);

  useEffect(() => {
    if (!preselectedEmployeeId) {
      return;
    }

    setSelectedEmployeeIds((current) => (current.includes(preselectedEmployeeId) ? current : [preselectedEmployeeId, ...current]));
  }, [preselectedEmployeeId]);

  const dateOptions = useMemo(() => {
    return Array.from({ length: 21 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);

      return {
        key: formatDateKey(date),
        monthLabel: date.toLocaleDateString(locale, { month: 'long' }),
        title: date.toLocaleDateString(locale, { month: 'long', day: '2-digit' }),
        weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
        dayLabel: date.toLocaleDateString(locale, { day: '2-digit' }),
        value: date,
      };
    });
  }, [locale, today]);

  const selectedDate = dateOptions.find((option) => option.key === selectedDateKey)?.value ?? today;
  const selectedGroups = useMemo(() => groups.filter((group) => selectedGroupIds.includes(group.id)), [groups, selectedGroupIds]);
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const invitedEmployees = useMemo(() => {
    const invitedById = new Map<string, EmployeeOption | GroupMemberOption>();

    selectedGroups.forEach((group) => {
      group.members.forEach((member) => {
        invitedById.set(member.id, employeeById.get(member.id) ?? member);
      });
    });

    selectedEmployeeIds.forEach((employeeId) => {
      const employee = employeeById.get(employeeId);

      if (employee) {
        invitedById.set(employeeId, employee);
      }
    });

    return Array.from(invitedById.values()).sort((left, right) =>
      `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, locale),
    );
  }, [employeeById, locale, selectedEmployeeIds, selectedGroups]);
  const invitedEmployeeIds = useMemo(() => invitedEmployees.map((employee) => employee.id), [invitedEmployees]);
  const selectedGroupMemberIdSet = useMemo(() => {
    const ids = new Set<string>();
    selectedGroups.forEach((group) => group.memberIds.forEach((memberId) => ids.add(memberId)));
    return ids;
  }, [selectedGroups]);
  const individuallyInvitedEmployees = useMemo(
    () => invitedEmployees.filter((employee) => !selectedGroupMemberIdSet.has(employee.id)),
    [invitedEmployees, selectedGroupMemberIdSet],
  );

  const orderedEmployees = useMemo(() => {
    return [...employees].sort((left, right) => {
      if (left.id === preselectedEmployeeId) return -1;
      if (right.id === preselectedEmployeeId) return 1;
      return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, locale);
    });
  }, [employees, locale, preselectedEmployeeId]);

  const scheduledAt = buildDateTime(selectedDate, startTime).toISOString();
  const endAt = endTime ? buildDateTime(selectedDate, endTime).toISOString() : undefined;
  const hasEndTime = endTime !== null;
  const participantSheetItemCount = groups.length + orderedEmployees.length;
  const shouldScrollParticipantSheet = participantSheetItemCount > 5;
  const nextButtonOffset = invitedEmployeeIds.length === 0 ? 80 : 20;
  const timeCardGap = 12;
  const collapsedStartWidth = timeRowWidth > 0 ? Math.max((timeRowWidth - timeCardGap) / 2, 0) : undefined;
  const expandedStartWidth = timeRowWidth > 0 ? timeRowWidth : undefined;
  const confirmDateLabel = selectedDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });
  const confirmTimeLabel = endTime ? `${formatTime(startTime.hour, startTime.minute)} - ${formatTime(endTime.hour, endTime.minute)}` : formatTime(startTime.hour, startTime.minute);

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleExpandedGroup(id: string) {
    setExpandedGroupIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleEndTime() {
    if (hasEndTime) {
      setEndTime(null);
      return;
    }

    setEndTime(addMinutesToTime(startTime.hour, startTime.minute, 30));
  }

  function renderEmployeeRow(
    employee: GroupMemberOption | EmployeeOption,
    options: {
      disabled?: boolean;
      isSelected: boolean;
      onPress: () => void;
      showDivider?: boolean;
    },
  ) {
    const { disabled = false, isSelected, onPress, showDivider = false } = options;
    const employeeSubtitle =
      'department' in employee
        ? employee.department?.name ?? employee.position?.name ?? employee.email
        : employee.departmentName ?? '';

    return (
      <PressableScale
        key={employee.id}
        className={`px-1 py-3 ${showDivider ? 'border-b border-[#e7ecf5]' : ''}`}
        disabled={disabled}
        haptic="selection"
        onPress={onPress}
      >
        <View className="flex-row items-center gap-3">
          <View className={`h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-border bg-white'}`}>
            {isSelected ? <Ionicons color="#ffffff" name="checkmark" size={14} /> : null}
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
            {employee.avatar ? (
              <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
            ) : (
              <Text className="text-[12px] font-extrabold text-foreground">{getEmployeeInitials(employee.firstName, employee.lastName)}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">{employee.firstName} {employee.lastName}</Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">{employeeSubtitle}</Text>
          </View>
        </View>
      </PressableScale>
    );
  }

  function renderGroupBlock(group: GroupOption) {
    const isExplicitlySelected = selectedGroupIds.includes(group.id);
    const isFullyCovered = group.memberIds.length > 0 && group.memberIds.every((memberId) => invitedEmployeeIds.includes(memberId));
    const isSelected = isExplicitlySelected || isFullyCovered;
    const isExpanded = expandedGroupIds.includes(group.id);
    const groupEmployees = group.members;

    return (
      <View key={group.id} className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
        <View className="flex-row items-center gap-3">
          <PressableScale
            className={`h-7 w-7 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-border bg-white'}`}
            haptic="selection"
            onPress={() => toggleGroup(group.id)}
          >
            {isSelected ? <Ionicons color="#ffffff" name="checkmark" size={16} /> : null}
          </PressableScale>

          <View className="flex-1">
            <Text className="text-[15px] font-bold text-foreground">{group.name}</Text>
            <Text className="mt-1 text-[13px] text-muted-foreground">{t('manager.groupMembersCount', { count: group.memberIds.length })}</Text>
          </View>

          <PressableScale className="h-8 w-8 items-center justify-center" haptic="selection" onPress={() => toggleExpandedGroup(group.id)}>
            <Ionicons color="#4b5563" name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </PressableScale>
        </View>

        {isExpanded ? (
          <View className="mt-4 border-t border-[#e7ecf5] pt-2">
            {groupEmployees.map((employee, index) =>
              renderEmployeeRow(employee, {
                disabled: isExplicitlySelected,
                isSelected: invitedEmployeeIds.includes(employee.id),
                onPress: () => toggleEmployee(employee.id),
                showDivider: index < groupEmployees.length - 1,
              }),
            )}
            {groupEmployees.length === 0 ? (
              <Text className="px-1 py-3 text-[13px] text-muted-foreground">{t('manager.meetingNoEmployees')}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  function handleNext() {
    if (!title.trim()) {
      Alert.alert('Error', t('manager.meetingTopicRequired'));
      return;
    }

    if (isDateTimeInPast(selectedDate, startTime)) {
      Alert.alert('Error', t('manager.meetingPastTimeNotAllowed'));
      return;
    }

    if (mode === 'online' && !link.trim()) {
      Alert.alert('Error', t('manager.meetingLinkRequired'));
      return;
    }

    if (mode === 'offline' && !location.trim()) {
      Alert.alert('Error', t('manager.meetingLocationRequired'));
      return;
    }

    if (invitedEmployeeIds.length === 0) {
      Alert.alert('Error', t('manager.meetingParticipantsRequired'));
      return;
    }

    if (endTime && buildDateTime(selectedDate, endTime).getTime() <= buildDateTime(selectedDate, startTime).getTime()) {
      Alert.alert('Error', t('manager.meetingEndAfterStart'));
      return;
    }

    setStep('confirm');
  }

  async function handleCreateMeeting() {
    setSubmitting(true);

    try {
      if (isDateTimeInPast(selectedDate, startTime)) {
        Alert.alert('Error', t('manager.meetingPastTimeNotAllowed'));
        setSubmitting(false);
        return;
      }

      const meetingMeta: SmartMeetingMeta = {
        endAt,
        invitedEmployeeIds,
        invitedGroupIds: selectedGroups.flatMap((group) => group.apiGroupIds),
        kind: 'meeting',
        meetingLink: mode === 'online' ? link.trim() : undefined,
        meetingLocation: mode === 'offline' ? location.trim() : undefined,
        meetingMode: mode,
        scheduledAt,
      };

      await Promise.all(
        invitedEmployeeIds.map((assigneeEmployeeId) =>
          createManagerTask({
            assigneeEmployeeId,
            description: appendTaskMeta('', meetingMeta),
            dueAt: scheduledAt,
            priority: 'MEDIUM',
            title: title.trim(),
          }),
        ),
      );

      Alert.alert('Success', t('manager.meetingCreated'));
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : t('manager.meetingCreateError'));
    } finally {
      setSubmitting(false);
    }
  }

  const pickerInitialValue = pickerTarget === 'end' ? endTime ?? addMinutesToTime(startTime.hour, startTime.minute, 30) : startTime;

  return (
    <>
      <Screen contentClassName="flex-grow gap-3 px-5 pb-5 pt-0" withGradient>
        <StatusBar backgroundColor="transparent" style="dark" translucent />

        <View className="flex-row items-center gap-3">
          <PressableScale
            className="h-8 w-8 items-center justify-center"
            haptic="selection"
            onPress={() => (step === 'confirm' ? setStep('details') : router.back())}
          >
            <Ionicons color="#1f2937" name="arrow-back" size={22} />
          </PressableScale>

          <Text className="flex-1 text-[24px] font-extrabold text-foreground">{step === 'details' ? t('manager.createMeetingTitle') : t('manager.meetingConfirmTitle')}</Text>
        </View>

        <View className={`${step === 'confirm' ? 'flex-1' : ''} gap-4`}>
          {step === 'details' ? (
            <View className="gap-5">
              {preselectedEmployeeName ? (
                <View className="items-center">
                  <Text className="text-center text-[13px] leading-5 text-muted-foreground">{t('manager.createMeetingSelectedEmployee', { employeeName: preselectedEmployeeName })}</Text>
                </View>
              ) : null}

              <TextInput
                className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
                onChangeText={setTitle}
                placeholder={t('manager.meetingTopic')}
                style={{ paddingHorizontal: 18, paddingVertical: 16 }}
                value={title}
              />

              <View className="gap-3">
                <Text className="text-center text-[14px] font-bold uppercase text-foreground">{dateOptions.find((option) => option.key === selectedDateKey)?.title}</Text>
                <ScrollView
                  className="-mx-[30px]"
                  contentContainerStyle={{ paddingHorizontal: 18 }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View className="flex-row gap-1">
                    {dateOptions.map((option) => {
                      const isSelected = option.key === selectedDateKey;

                      return (
                        <PressableScale
                          key={option.key}
                          className={`min-w-[48px] rounded-full border-2 px-3 py-3 ${isSelected ? 'border-primary bg-primary' : 'border-border bg-white'}`}
                          haptic="selection"
                          onPress={() => setSelectedDateKey(option.key)}
                        >
                          <Text className={`text-center text-[12px] font-semibold ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{option.weekday}</Text>
                          <Text className={`mt-1 text-center text-[22px] font-extrabold ${isSelected ? 'text-white' : 'text-foreground'}`}>{option.dayLabel}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <PressableScale className="flex-row items-center gap-2" haptic="selection" onPress={toggleEndTime}>
                    <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${hasEndTime ? 'border-primary bg-primary' : 'border-border bg-white'}`}>
                      {hasEndTime ? <Ionicons color="#ffffff" name="checkmark" size={16} /> : null}
                    </View>
                    <Text className="text-[15px] font-bold text-foreground">{t('manager.meetingEndTime')}</Text>
                  </PressableScale>
                </View>

                <View
                  className="flex-row gap-3"
                  onLayout={(event) => {
                    const nextWidth = event.nativeEvent.layout.width;
                    if (Math.abs(nextWidth - timeRowWidth) > 1) {
                      setTimeRowWidth(nextWidth);
                    }
                  }}
                >
                  <Animated.View
                    style={{
                      width: hasEndTime ? collapsedStartWidth : expandedStartWidth,
                      transitionDuration: 280,
                      transitionProperty: ['width'],
                    } as any}
                  >
                    <PressableScale className="w-full rounded-[24px] border-2 border-border bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10" haptic="selection" onPress={() => setPickerTarget('start')}>
                      <Text className="text-[13px] font-bold uppercase tracking-[1px] text-muted-foreground">{t('manager.meetingStartTime')}</Text>
                      <Text className="mt-2 text-[24px] font-extrabold text-foreground">{formatTime(startTime.hour, startTime.minute)}</Text>
                    </PressableScale>
                  </Animated.View>

                  {hasEndTime ? (
                    <Animated.View
                      style={{
                        width: collapsedStartWidth,
                        transitionDuration: 280,
                        transitionProperty: ['width', 'opacity'],
                      } as any}
                    >
                      <PressableScale className="w-full rounded-[24px] border-2 border-border bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10" haptic="selection" onPress={() => setPickerTarget('end')}>
                        <Text className="text-[13px] font-bold uppercase tracking-[1px] text-muted-foreground">{t('manager.meetingEndTime')}</Text>
                        <Text className="mt-2 text-[24px] font-extrabold text-foreground">{endTime ? formatTime(endTime.hour, endTime.minute) : t('manager.meetingNoEndTime')}</Text>
                      </PressableScale>
                    </Animated.View>
                  ) : null}
                </View>
              </View>

              <View className="gap-3">
                <Text className="text-[14px] font-bold text-foreground">{t('manager.meetingMode')}</Text>
                <View className="flex-row rounded-[18px] border border-border bg-[#f3f5f9] p-1">
                  <Pressable onPress={() => setMode('online')} style={{ flex: 1 }}>
                    <View className={`items-center justify-center px-4 py-3 ${mode === 'online' ? 'rounded-l-[18px] rounded-r-[6px] bg-white' : 'rounded-[18px] bg-transparent'}`}>
                      <Text className={`text-[14px] font-bold ${mode === 'online' ? 'text-foreground' : 'text-muted-foreground'}`}>{t('manager.meetingModeOnline')}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => setMode('offline')} style={{ flex: 1 }}>
                    <View className={`items-center justify-center px-4 py-3 ${mode === 'offline' ? 'rounded-l-[6px] rounded-r-[18px] bg-white' : 'rounded-[18px] bg-transparent'}`}>
                      <Text className={`text-[14px] font-bold ${mode === 'offline' ? 'text-foreground' : 'text-muted-foreground'}`}>{t('manager.meetingModeOffline')}</Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              <TextInput
                autoCapitalize={mode === 'online' ? 'none' : 'sentences'}
                autoCorrect={false}
                className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
                onChangeText={mode === 'online' ? setLink : setLocation}
                placeholder={mode === 'online' ? t('manager.meetingLinkPastePlaceholder') : t('manager.meetingLocation')}
                style={{ paddingHorizontal: 18, paddingVertical: 16 }}
                value={mode === 'online' ? link : location}
              />

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] font-bold text-foreground">{t('manager.meetingParticipants')}</Text>
                  <PressableScale
                    className="min-h-10 min-w-[92px] items-center justify-center rounded-full border border-[#d8e2f0] bg-white px-4"
                    haptic="selection"
                    onPress={() => setParticipantSheetOpen(true)}
                  >
                    <Text className="text-[14px] font-semibold text-foreground">{`+ ${t('common.add')}`}</Text>
                  </PressableScale>
                </View>

                {loading ? (
                  <Text className="text-[14px] text-muted-foreground">{t('manager.meetingLoadingParticipants')}</Text>
                ) : (
                  <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="text-[13px] font-semibold text-muted-foreground">{t('manager.meetingSelectedCount', { count: invitedEmployeeIds.length })}</Text>
                    </View>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {invitedEmployees.map((employee) => (
                        <View key={employee.id} className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#eef2ff]">
                          {employee.avatar ? (
                            <Image source={employee.avatar} className="h-9 w-9 rounded-full" resizeMode="cover" />
                          ) : (
                            <Text className="text-[12px] font-extrabold text-foreground">{getEmployeeInitials(employee.firstName, employee.lastName)}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <View className="mt-3 gap-2">
                      {selectedGroups.map((group) => (
                        <View key={group.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                          <View className="flex-1">
                            <Text className="text-[14px] font-semibold text-foreground">{formatFullGroupLabel(group.name)}</Text>
                            <Text className="text-[12px] text-muted-foreground">{t('manager.groupMembersCount', { count: group.memberIds.length })}</Text>
                          </View>
                        </View>
                      ))}
                      {individuallyInvitedEmployees.map((employee) => (
                        <View key={employee.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                            {employee.avatar ? (
                              <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
                            ) : (
                              <Text className="text-[12px] font-extrabold text-foreground">{getEmployeeInitials(employee.firstName, employee.lastName)}</Text>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className="text-[14px] font-semibold text-foreground">{employee.firstName} {employee.lastName}</Text>
                            <Text className="text-[12px] text-muted-foreground">
                              {'department' in employee
                                ? employee.department?.name ?? employee.position?.name ?? employee.email
                                : employee.departmentName ?? ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {invitedEmployeeIds.length === 0 ? (
                        <Text className="text-[14px] leading-6 text-muted-foreground">{t('manager.meetingParticipantsRequired')}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>

              <PressableScale
                className="rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30"
                haptic="selection"
                onPress={handleNext}
                style={{ marginTop: nextButtonOffset }}
              >
                <Text className="text-center font-display text-[16px] font-semibold text-white">{t('manager.meetingNext')}</Text>
              </PressableScale>
            </View>
          ) : (
            <View className="flex-1 justify-between gap-4">
              <View className="gap-4">
                <View className="items-center gap-2 px-2 pt-2">
                  <Text className="text-center text-[26px] font-extrabold text-foreground">{title.trim()}</Text>
                  <Text className="text-center text-[14px] leading-6 text-muted-foreground">{confirmDateLabel}</Text>
                </View>

                <Card inset="compact" className="gap-4 rounded-[28px] border-white/80 bg-[#fafcff] p-4 shadow-sm shadow-[#1f2687]/8">
                  <Text className="text-[13px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingInfo')}</Text>

                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-[18px] bg-white px-4 py-3">
                      <View className="flex-row items-center gap-2">
                        <Ionicons color="#64748b" name="calendar-outline" size={16} />
                        <Text className="text-[12px] font-bold uppercase tracking-[1px] text-muted-foreground">Date</Text>
                      </View>
                      <Text className="mt-2 text-[15px] font-bold text-foreground">{selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}</Text>
                    </View>

                    <View className="flex-1 rounded-[18px] bg-white px-4 py-3">
                      <View className="flex-row items-center gap-2">
                        <Ionicons color="#64748b" name="time-outline" size={16} />
                        <Text className="text-[12px] font-bold uppercase tracking-[1px] text-muted-foreground">Time</Text>
                      </View>
                      <Text className="mt-2 text-[15px] font-bold text-foreground">{confirmTimeLabel}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    <Badge className="border-[#d8e2f0] bg-white px-4 py-2" label={mode === 'online' ? t('manager.meetingModeOnline') : t('manager.meetingModeOffline')} variant="muted" />
                    <Badge className="border-[#d8e2f0] bg-white px-4 py-2" label={`${invitedEmployeeIds.length}`} variant="muted">
                      <Ionicons color="#334155" name="people" size={14} />
                    </Badge>
                  </View>
                </Card>

                <Card inset="compact" className="gap-4 rounded-[28px] border-white/80 bg-[#fafcff] p-4 shadow-sm shadow-[#1f2687]/8">
                  <Text className="text-[13px] font-bold uppercase tracking-[1.2px] text-muted-foreground">Assigned to</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2 pr-1">
                      {invitedEmployees.map((employee) => (
                        <View key={employee.id} className="w-[68px] items-center gap-2">
                          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#eef2ff]">
                            {employee.avatar ? (
                              <Image source={employee.avatar} className="h-14 w-14 rounded-full" resizeMode="cover" />
                            ) : (
                              <Text className="text-[15px] font-extrabold text-foreground">{getEmployeeInitials(employee.firstName, employee.lastName)}</Text>
                            )}
                          </View>
                          <Text className="text-center text-[12px] font-semibold text-foreground" numberOfLines={2}>{employee.firstName}</Text>
                        </View>
                      ))}

                      <PressableScale className="w-[68px] items-center gap-2" haptic="selection" onPress={() => setParticipantSheetOpen(true)}>
                        <View className="h-14 w-14 items-center justify-center rounded-full border border-[#d8e2f0] bg-white">
                          <Ionicons color="#334155" name="add" size={22} />
                        </View>
                        <Text className="text-center text-[12px] font-semibold text-foreground">{t('manager.meetingAddMore')}</Text>
                      </PressableScale>
                    </View>
                  </ScrollView>
                </Card>

                <Card inset="compact" className="gap-3 rounded-[28px] border-white/80 bg-[#fafcff] p-4 shadow-sm shadow-[#1f2687]/8">
                  <Text className="text-[13px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{mode === 'online' ? t('manager.meetingLink') : t('manager.meetingLocation')}</Text>
                  <View className="rounded-[20px] bg-white px-4 py-4">
                    <View className="flex-row items-start gap-3">
                      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff]">
                        <Ionicons color="#4f46e5" name={mode === 'online' ? 'link-outline' : 'location-outline'} size={18} />
                      </View>
                      <Text className={`flex-1 text-[15px] leading-6 ${mode === 'online' ? 'text-[#2563eb]' : 'text-foreground'}`}>{mode === 'online' ? link.trim() : location.trim()}</Text>
                    </View>
                  </View>
                </Card>
              </View>

              <View className="pt-2 flex-row gap-3 px-1">
                <View className="flex-1">
                  <PressableScale className="min-h-14 items-center justify-center rounded-full border border-[#d8e2f0] bg-white" haptic="selection" onPress={() => setStep('details')}>
                    <Text className="text-[15px] font-extrabold text-foreground">{t('manager.meetingEditDetails')}</Text>
                  </PressableScale>
                </View>
                <View className="flex-1">
                  <PressableScale
                    className={`min-h-14 items-center justify-center rounded-full border border-transparent bg-[#6d73ff] shadow-lg shadow-[#6d73ff]/25 ${submitting ? 'opacity-60' : ''}`}
                    disabled={submitting}
                    haptic="selection"
                    onPress={() => void handleCreateMeeting()}
                  >
                    <Text className="text-[15px] font-extrabold text-white">{submitting ? t('common.processing') : t('manager.meetingCreateTask')}</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          )}
        </View>
      </Screen>

      <TimeWheelPicker
        allowClear={pickerTarget === 'end' && endTime !== null}
        initialValue={pickerInitialValue}
        onApply={(value) => {
          if (pickerTarget === 'end') {
            setEndTime(value);
          } else {
            setStartTime(value);
          }
          setPickerTarget(null);
        }}
        onClear={pickerTarget === 'end' ? () => {
          setEndTime(null);
          setPickerTarget(null);
        } : undefined}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget === 'end' ? t('manager.meetingEndTime') : t('manager.meetingStartTime')}
        visible={pickerTarget !== null}
      />

      <BottomSheetModal
        onClose={() => setParticipantSheetOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={participantSheetOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">{t('manager.meetingParticipantPickerTitle')}</Text>
          </View>
          <PressableScale className="h-10 min-w-[72px] items-center justify-center rounded-full px-3" haptic="selection" onPress={() => setParticipantSheetOpen(false)}>
            <Text className="text-[15px] font-semibold text-foreground">{t('common.done')}</Text>
          </PressableScale>
        </View>

        {loading ? (
          <Text className="text-[14px] text-muted-foreground">{t('manager.meetingLoadingParticipants')}</Text>
        ) : (
          <View className={shouldScrollParticipantSheet ? 'max-h-[440px]' : ''}>
            {shouldScrollParticipantSheet ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {groups.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingGroups')}</Text>
                      {groups.map((group) => renderGroupBlock(group))}
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">{t('manager.meetingNoGroups')}</Text>
                  )}

                  {orderedEmployees.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingEmployees')}</Text>
                      <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                        {orderedEmployees.map((employee, index) =>
                          renderEmployeeRow(employee, {
                            isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroups.some((group) => group.memberIds.includes(employee.id)),
                            onPress: () => toggleEmployee(employee.id),
                            showDivider: index < orderedEmployees.length - 1,
                          }),
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">{t('manager.meetingNoEmployees')}</Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View className="gap-4">
                {groups.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingGroups')}</Text>
                    {groups.map((group) => renderGroupBlock(group))}
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">{t('manager.meetingNoGroups')}</Text>
                )}

                {orderedEmployees.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingEmployees')}</Text>
                    <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                      {orderedEmployees.map((employee, index) =>
                        renderEmployeeRow(employee, {
                          isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroups.some((group) => group.memberIds.includes(employee.id)),
                          onPress: () => toggleEmployee(employee.id),
                          showDivider: index < orderedEmployees.length - 1,
                        }),
                      )}
                    </View>
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">{t('manager.meetingNoEmployees')}</Text>
                )}
              </View>
            )}
          </View>
        )}
      </BottomSheetModal>
    </>
  );
}
