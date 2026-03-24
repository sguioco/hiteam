import { Fragment, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import { createManagerTask, createManagerTaskTemplate, loadManagerEmployees } from '../../lib/api';
import { hapticSelection } from '../../lib/haptics';
import { getDateLocale, useI18n } from '../../lib/i18n';
import {
  buildDepartmentFallbackGroups,
  type EmployeeOption,
  type GroupMemberOption,
  type GroupOption,
  mergeGroupOptions,
} from '../../lib/manager-group-options';
import { TimeWheelPicker, type TimeValue } from '../../src/components/TimeWheelPicker';
import BottomSheetModal from '../../src/components/BottomSheetModal';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' as const },
  { label: 'Medium', value: 'MEDIUM' as const },
  { label: 'High', value: 'HIGH' as const },
] as const;

const PRIORITY_COLORS: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  HIGH: '#ef4444',
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
};

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

type TaskOptionCheckboxProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

function TaskOptionCheckbox({ checked, label, onPress }: TaskOptionCheckboxProps) {
  return (
    <Pressable
      style={styles.taskOptionPressable}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
    >
      <View style={styles.taskOptionRow}>
        <View
          style={[
            styles.taskOptionBox,
            checked ? styles.taskOptionBoxChecked : styles.taskOptionBoxUnchecked,
          ]}
        >
          {checked ? <Ionicons color="#ffffff" name="checkmark" size={13} /> : null}
        </View>
        <Text style={styles.taskOptionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const params = useLocalSearchParams<{ employeeId?: string | string[]; employeeName?: string | string[] }>();
  const preselectedEmployeeId = normalizeParam(params.employeeId);
  const today = useMemo(() => new Date(), []);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(today));
  const [dueTime, setDueTime] = useState<TimeValue>({ hour: 10, minute: 0 });
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(preselectedEmployeeId ? [preselectedEmployeeId] : []);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

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
        title: date.toLocaleDateString(locale, { month: 'long', day: '2-digit' }),
        weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
        dayLabel: date.toLocaleDateString(locale, { day: '2-digit' }),
        value: date,
      };
    });
  }, [locale, today]);

  const selectedDate = dateOptions.find((option) => option.key === selectedDateKey)?.value ?? today;

  const orderedEmployees = useMemo(() => {
    return [...employees].sort((left, right) => {
      if (left.id === preselectedEmployeeId) return -1;
      if (right.id === preselectedEmployeeId) return 1;
      return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`);
    });
  }, [employees, preselectedEmployeeId]);

  const selectedGroups = useMemo(() => groups.filter((group) => selectedGroupIds.includes(group.id)), [groups, selectedGroupIds]);
  const selectedGroupMemberIdSet = useMemo(() => {
    const ids = new Set<string>();
    selectedGroups.forEach((group) => group.memberIds.forEach((memberId) => ids.add(memberId)));
    return ids;
  }, [selectedGroups]);
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const selectedAssignees = useMemo(() => {
    const selectedById = new Map<string, EmployeeOption | GroupMemberOption>();

    selectedGroups.forEach((group) => {
      group.members.forEach((member) => {
        selectedById.set(member.id, employeeById.get(member.id) ?? member);
      });
    });

    selectedEmployeeIds.forEach((employeeId) => {
      const employee = employeeById.get(employeeId);

      if (employee) {
        selectedById.set(employeeId, employee);
      }
    });

    return Array.from(selectedById.values()).sort((left, right) =>
      `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`),
    );
  }, [employeeById, selectedEmployeeIds, selectedGroups]);
  const selectedAssigneeIds = useMemo(() => selectedAssignees.map((employee) => employee.id), [selectedAssignees]);
  const priorityIndex = PRIORITY_OPTIONS.findIndex((option) => option.value === priority);
  const activePriorityColor = PRIORITY_COLORS[priority];
  const createTaskButtonOffset = selectedAssigneeIds.length === 0 ? 85 : 25;

  const individuallySelectedEmployees = useMemo(
    () => selectedAssignees.filter((employee) => !selectedGroupMemberIdSet.has(employee.id)),
    [selectedAssignees, selectedGroupMemberIdSet],
  );

  const assigneeSheetItemCount = groups.length + orderedEmployees.length;
  const shouldScrollAssigneeSheet = assigneeSheetItemCount > 5;

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleExpandedGroup(id: string) {
    setExpandedGroupIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
    const isFullyCovered = group.memberIds.length > 0 && group.memberIds.every((memberId) => selectedAssigneeIds.includes(memberId));
    const isSelected = isExplicitlySelected || isFullyCovered;
    const isExpanded = expandedGroupIds.includes(group.id);

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
            {group.members.map((employee, index) =>
              renderEmployeeRow(employee, {
                disabled: isExplicitlySelected,
                isSelected: selectedAssigneeIds.includes(employee.id),
                onPress: () => toggleEmployee(employee.id),
                showDivider: index < group.members.length - 1,
              }),
            )}
            {group.members.length === 0 ? (
              <Text className="px-1 py-3 text-[13px] text-muted-foreground">{t('manager.meetingNoEmployees')}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Error', 'Task title is required.');
      return;
    }

    if (isDateTimeInPast(selectedDate, dueTime)) {
      Alert.alert('Error', t('manager.meetingPastTimeNotAllowed'));
      return;
    }

    if (selectedAssigneeIds.length === 0) {
      Alert.alert('Error', 'Select at least one assignee.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRecurring) {
        await Promise.all(
          selectedAssigneeIds.map((assigneeEmployeeId) =>
            createManagerTaskTemplate({
              assigneeEmployeeId,
              description: description.trim() || undefined,
              dueAfterDays: 0,
              dueTimeLocal: formatTime(dueTime.hour, dueTime.minute),
              frequency: 'DAILY',
              isActive: true,
              priority,
              requiresPhoto,
              startDate: selectedDateKey,
              title: title.trim(),
            }),
          ),
        );
      } else {
        await Promise.all(
          selectedAssigneeIds.map((assigneeEmployeeId) =>
            createManagerTask({
              assigneeEmployeeId,
              description: description.trim() || undefined,
              dueAt: buildDateTime(selectedDate, dueTime).toISOString(),
              priority,
              requiresPhoto,
              title: title.trim(),
            }),
          ),
        );
      }

      Alert.alert('Success', isRecurring ? 'Recurring tasks created successfully.' : 'Tasks created successfully.');
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create tasks.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Screen contentClassName="flex-grow gap-3 px-5 pb-4 pt-0" withGradient>
        <StatusBar backgroundColor="transparent" style="dark" translucent />

        <View className="flex-row items-center gap-3">
          <PressableScale className="h-8 w-8 items-center justify-center" haptic="selection" onPress={() => router.back()}>
            <Ionicons color="#1f2937" name="arrow-back" size={22} />
          </PressableScale>
          <Text className="flex-1 text-[24px] font-extrabold text-foreground">{t('manager.createTaskTitle')}</Text>
        </View>

        <View className="gap-4">
          <TextInput
            className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
            onChangeText={setTitle}
            placeholder={t('manager.createTaskTitlePlaceholder')}
            style={{ paddingHorizontal: 18, paddingVertical: 16 }}
            value={title}
          />

          <View className="gap-4">
            <Text className="text-center text-[14px] font-bold uppercase text-foreground">
              {dateOptions.find((option) => option.key === selectedDateKey)?.title}
            </Text>
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

          <PressableScale
            className="rounded-[24px] border-2 border-border bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10"
            haptic="selection"
            onPress={() => setTimePickerOpen(true)}
          >
            <Text className="text-[13px] font-bold uppercase tracking-[1px] text-muted-foreground">{t('manager.createTaskDueTime')}</Text>
            <Text className="mt-2 text-[24px] font-extrabold text-foreground">{formatTime(dueTime.hour, dueTime.minute)}</Text>
          </PressableScale>

          <View className="flex-row items-start px-1">
            {PRIORITY_OPTIONS.map((option, index) => {
              const isReached = index <= priorityIndex;
              const isCurrent = index === priorityIndex;
              const isConnectorActive = index < priorityIndex;

              return (
                <Fragment key={option.value}>
                  <PressableScale
                    className="w-[74px] items-center"
                    haptic="selection"
                    onPress={() => setPriority(option.value)}
                  >
                    <Text className={`mb-3 text-center text-[13px] font-bold ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {option.label}
                    </Text>
                    <View
                      className="h-6 w-6 rounded-full border-[3px]"
                      style={{
                        borderColor: isReached ? activePriorityColor : '#d7deea',
                        backgroundColor: isReached ? activePriorityColor : '#ffffff',
                      }}
                    />
                  </PressableScale>

                  {index < PRIORITY_OPTIONS.length - 1 ? (
                    <View
                      className="mt-[36px] h-[3px] flex-1 rounded-full"
                      style={{ backgroundColor: isConnectorActive ? activePriorityColor : '#d7deea' }}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </View>

          <View>
            <TextInput
              className="min-h-[120px] w-full rounded-2xl border-2 border-[#8f99ab] bg-surface px-4 py-4 text-[16px] text-foreground"
              multiline
              numberOfLines={5}
              onChangeText={setDescription}
              placeholder={t('manager.createTaskDescriptionPlaceholder')}
              textAlignVertical="top"
              value={description}
            />
          </View>

          <View className="flex-row gap-6 px-1">
            <TaskOptionCheckbox checked={isRecurring} label={t('manager.createTaskRecurring')} onPress={() => setIsRecurring((current) => !current)} />
            <TaskOptionCheckbox checked={requiresPhoto} label={t('manager.createTaskPhotoProof')} onPress={() => setRequiresPhoto((current) => !current)} />
          </View>

          <View className="gap-3">
            {loading ? (
              <Text className="text-[14px] text-muted-foreground">{t('manager.meetingLoadingParticipants')}</Text>
            ) : (
              <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-[13px] font-semibold text-muted-foreground">{t('manager.createTaskSelectedAssignees', { count: selectedAssigneeIds.length })}</Text>
                  <PressableScale
                    className="min-h-10 min-w-[92px] items-center justify-center rounded-full border border-[#d8e2f0] bg-white px-4"
                    haptic="selection"
                    onPress={() => setAssigneeSheetOpen(true)}
                  >
                    <Text className="text-[14px] font-semibold text-foreground">{`+ ${t('common.add')}`}</Text>
                  </PressableScale>
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                  {selectedAssignees.map((employee) => (
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

                  {individuallySelectedEmployees.map((employee) => (
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

                  {selectedAssigneeIds.length === 0 ? (
                    <Text className="text-[14px] leading-6 text-muted-foreground">{t('manager.createTaskAssigneeRequired')}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          <PressableScale
            className="rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30"
            haptic="selection"
            onPress={() => void handleSubmit()}
            style={{ marginTop: createTaskButtonOffset }}
          >
            <Text className="text-center font-display text-[16px] font-semibold text-white">
              {submitting ? t('manager.createTaskCreating') : isRecurring ? t('manager.createTaskRecurringSubmit') : t('manager.createTaskSubmit')}
            </Text>
          </PressableScale>
        </View>
      </Screen>

      <BottomSheetModal
        onClose={() => setAssigneeSheetOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={assigneeSheetOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">{t('manager.createTaskAssigneePickerTitle')}</Text>
          </View>
          <PressableScale className="h-10 min-w-[72px] items-center justify-center rounded-full px-3" haptic="selection" onPress={() => setAssigneeSheetOpen(false)}>
            <Text className="text-[15px] font-semibold text-foreground">{t('common.done')}</Text>
          </PressableScale>
        </View>

        {loading ? (
          <Text className="text-[14px] text-muted-foreground">{t('manager.meetingLoadingParticipants')}</Text>
        ) : (
          <View className={shouldScrollAssigneeSheet ? 'max-h-[440px]' : ''}>
            {shouldScrollAssigneeSheet ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {groups.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">{t('manager.meetingGroups')}</Text>
                      {groups.map((group) => renderGroupBlock(group))}
                    </View>
                  ) : null}

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
                ) : null}

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

      <TimeWheelPicker
        initialValue={dueTime}
        onApply={(value) => {
          setDueTime(value);
          setTimePickerOpen(false);
        }}
        onClose={() => setTimePickerOpen(false)}
        title={t('manager.createTaskDueTime')}
        visible={timePickerOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  taskOptionPressable: {
    flex: 1,
    minHeight: 28,
    justifyContent: 'center',
  },
  taskOptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  taskOptionBox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  taskOptionBoxChecked: {
    backgroundColor: '#6d73ff',
    borderColor: '#6d73ff',
  },
  taskOptionBoxUnchecked: {
    backgroundColor: '#ffffff',
    borderColor: '#bcc8da',
  },
  taskOptionLabel: {
    color: '#243042',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
