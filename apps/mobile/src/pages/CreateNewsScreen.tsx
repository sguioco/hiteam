import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../components/ui/text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppGradientBackground } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../components/BottomSheetModal';
import { createManagerAnnouncement, loadManagerEmployees, loadManagerGroups } from '../../lib/api';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import {
  getDateLocale,
  getDirectionalIconStyle,
  getTextDirectionStyle,
  useI18n,
} from '../../lib/i18n';
import {
  mapApiGroups,
  type EmployeeOption,
  type GroupMemberOption,
  type GroupOption,
} from '../../lib/manager-group-options';
import {
  NewsImageCropperModal,
  type NewsImageDraft,
  type NewsImageSource,
} from '../components/news-image-cropper-modal';
import { ParticipantAvatarStrip } from '../components/participant-avatar-strip';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';

type NewsOptionCheckboxProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

type CreateNewsSubmitButtonProps = {
  disabled?: boolean;
  label: string;
  loadingLabel: string;
  onPress: () => void;
  submitting: boolean;
};

const CREATE_NEWS_SUBMIT_BUTTON_OFFSET = 20;
const CREATE_NEWS_SUBMIT_BUTTON_HEIGHT = 56;
const CREATE_NEWS_SUBMIT_BUTTON_BASE_BOTTOM = 0;
const CREATE_NEWS_SUBMIT_BUTTON_SIDE_PADDING = 20;

function NewsOptionCheckbox({ checked, label, onPress }: NewsOptionCheckboxProps) {
  return (
    <Pressable
      style={styles.optionPressable}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
    >
      <View style={styles.optionRow}>
        <View
          style={[
            styles.optionBox,
            checked ? styles.optionBoxChecked : styles.optionBoxUnchecked,
          ]}
        >
          {checked ? <Ionicons color="#ffffff" name="checkmark" size={13} /> : null}
        </View>
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function CreateNewsSubmitButton({
  disabled = false,
  label,
  loadingLabel,
  onPress,
  submitting,
}: CreateNewsSubmitButtonProps) {
  return (
    <PressableScale
      className="rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30"
      dimWhenDisabled={false}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
    >
      <Text className="text-center font-display text-[16px] font-semibold text-white">
        {submitting ? loadingLabel : label}
      </Text>
    </PressableScale>
  );
}

function getEmployeeInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getEmployeeSubtitle(employee: GroupMemberOption | EmployeeOption) {
  return 'department' in employee
    ? employee.department?.name ?? employee.position?.name ?? employee.email
    : employee.departmentName ?? '';
}

export default function CreateNewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const directionalIconStyle = useMemo(() => getDirectionalIconStyle(language), [language]);
  const textDirectionStyle = useMemo(() => getTextDirectionStyle(language), [language]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageDraft, setImageDraft] = useState<NewsImageDraft | null>(null);
  const [cropSource, setCropSource] = useState<NewsImageSource | null>(null);
  const [cropVisible, setCropVisible] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantSheetOpen, setParticipantSheetOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [limitParticipants, setLimitParticipants] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const imageAspectRatio = useMemo(
    () => announcementAspectRatioToNumber(imageDraft?.aspectRatio),
    [imageDraft?.aspectRatio],
  );
  const orderedEmployees = useMemo(
    () =>
      [...employees].sort((left, right) =>
        `${left.firstName} ${left.lastName}`.localeCompare(
          `${right.firstName} ${right.lastName}`,
          locale,
        ),
      ),
    [employees, locale],
  );
  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedGroupIds.includes(group.id)),
    [groups, selectedGroupIds],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedEmployeeIds.includes(employee.id)),
    [employees, selectedEmployeeIds],
  );
  const selectedGroupMemberIdSet = useMemo(() => {
    const ids = new Set<string>();
    selectedGroups.forEach((group) => group.memberIds.forEach((memberId) => ids.add(memberId)));
    return ids;
  }, [selectedGroups]);
  const selectedParticipants = useMemo(() => {
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
      `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`,
        locale,
      ),
    );
  }, [employeeById, locale, selectedEmployeeIds, selectedGroups]);
  const individuallySelectedEmployees = useMemo(
    () => selectedParticipants.filter((employee) => !selectedGroupMemberIdSet.has(employee.id)),
    [selectedGroupMemberIdSet, selectedParticipants],
  );
  const shouldScrollParticipantSheet = groups.length + orderedEmployees.length > 5;
  const submitButtonBottom = insets.bottom + CREATE_NEWS_SUBMIT_BUTTON_BASE_BOTTOM;
  const submitButtonContentPadding =
    submitButtonBottom + CREATE_NEWS_SUBMIT_BUTTON_HEIGHT + Math.max(CREATE_NEWS_SUBMIT_BUTTON_OFFSET, 0) + 28;

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const [employeesResult, groupsResult] = await Promise.all([
          loadManagerEmployees(),
          loadManagerGroups(),
        ]);

        if (!active) {
          return;
        }

        const mappedGroups = mapApiGroups(groupsResult);
        setEmployees(employeesResult);
        setGroups(mappedGroups);
        setExpandedGroupIds(mappedGroups.map((group) => group.id));
      } catch {
        if (!active) {
          return;
        }

        setEmployees([]);
        setGroups([]);
      } finally {
        if (active) {
          setParticipantsLoading(false);
        }
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, []);

  function openCropper(source: NewsImageSource) {
    setCropSource(source);
    setCropVisible(true);
  }

  function toggleExpandedGroup(id: string) {
    setExpandedGroupIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((item) => item !== groupId)
        : [...current, groupId],
    );
    setSelectedEmployeeIds([]);
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((item) => item !== employeeId)
        : [...current, employeeId],
    );
    setSelectedGroupIds([]);
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
    const subtitle = getEmployeeSubtitle(employee);

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
            {'avatar' in employee && employee.avatar ? (
              <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
            ) : (
              <Text className="text-[12px] font-extrabold text-foreground">
                {getEmployeeInitials(employee.firstName, employee.lastName)}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">
              {employee.firstName} {employee.lastName}
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">{subtitle}</Text>
          </View>
        </View>
      </PressableScale>
    );
  }

  function renderGroupBlock(group: GroupOption) {
    const isExplicitlySelected = selectedGroupIds.includes(group.id);
    const isSelected = isExplicitlySelected;
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
            <Text className="mt-1 text-[13px] text-muted-foreground">
              {t('manager.groupMembersCount', { count: group.memberIds.length })}
            </Text>
          </View>

          <PressableScale
            className="h-8 w-8 items-center justify-center"
            haptic="selection"
            onPress={() => toggleExpandedGroup(group.id)}
          >
            <Ionicons color="#4b5563" name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </PressableScale>
        </View>

        {isExpanded ? (
          <View className="mt-4 border-t border-[#e7ecf5] pt-2">
            {group.members.map((employee, index) =>
              renderEmployeeRow(employee, {
                disabled: isExplicitlySelected,
                isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                onPress: () => toggleEmployee(employee.id),
                showDivider: index < group.members.length - 1,
              }),
            )}
          </View>
        ) : null}
      </View>
    );
  }

  async function handlePickImage(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        hapticError();
        Alert.alert(
          'Error',
          t('manager.createNewsPhotoPermissionDenied'),
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 1,
              selectionLimit: 1,
            });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      openCropper({
        height: asset.height ?? 1,
        mimeType: asset.mimeType || 'image/jpeg',
        uri: asset.uri,
        width: asset.width ?? 1,
      });
    } catch (error) {
      hapticError();
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : t('manager.createNewsPhotoError'),
      );
    }
  }

  function openImageSourcePicker() {
    Alert.alert(
      t('manager.createNewsPhotoTitle'),
      t('manager.createNewsPhotoPrompt'),
      [
        {
          text: t('manager.createNewsPhotoCamera'),
          onPress: () => void handlePickImage('camera'),
        },
        {
          text: t('manager.createNewsPhotoLibrary'),
          onPress: () => void handlePickImage('library'),
        },
        {
          style: 'cancel',
          text: t('manager.createNewsPhotoCancel'),
        },
      ],
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Error', t('manager.createNewsTitleRequired'));
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', t('manager.createNewsBodyRequired'));
      return;
    }

    if (
      limitParticipants &&
      selectedGroupIds.length === 0 &&
      selectedEmployeeIds.length === 0
    ) {
      Alert.alert(
        t('common.error'),
        t('manager.createNewsSelectParticipantsError'),
      );
      return;
    }

    setSubmitting(true);

    try {
      await createManagerAnnouncement({
        audience: !limitParticipants
          ? 'ALL'
          : selectedGroups.length > 0
            ? 'GROUP'
            : 'EMPLOYEE',
        title: title.trim(),
        body: body.trim(),
        ...(limitParticipants && selectedGroups.length > 0
          ? { groupIds: selectedGroups.flatMap((group) => group.apiGroupIds) }
          : {}),
        ...(limitParticipants && selectedEmployeeIds.length > 0
          ? { targetEmployeeIds: selectedEmployeeIds }
          : {}),
        ...(imageDraft
          ? {
              imageAspectRatio: imageDraft.aspectRatio,
              imageDataUrl: imageDraft.dataUrl,
            }
          : {}),
      });

      hapticSuccess();
      Alert.alert(t('common.done'), t('manager.createNewsCreated'));
      router.replace('/?tab=news' as never);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('manager.createNewsError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#41e4f6]">
      <AppGradientBackground />
      <StatusBar backgroundColor="transparent" style="dark" translucent />
      <View className="flex-1">
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerClassName="gap-4 px-5 pt-0"
          contentContainerStyle={{ paddingBottom: submitButtonContentPadding }}
        >
          <View className="flex-row items-center gap-3">
            <PressableScale
              className="h-8 w-8 items-center justify-center"
              haptic="selection"
              onPress={() => router.back()}
            >
              <Ionicons color="#1f2937" name="arrow-back" size={22} style={directionalIconStyle} />
            </PressableScale>
            <Text className="flex-1 text-[24px] font-extrabold text-foreground">
              {t('manager.createNewsTitle')}
            </Text>
          </View>

          <Text className="text-[14px] leading-6 text-muted-foreground">
            {t('manager.createNewsHint')}
          </Text>

          <TextInput
            autoCorrect={false}
            className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            onChangeText={setTitle}
            placeholder={t('manager.createNewsTitlePlaceholder')}
            style={[textDirectionStyle, { paddingHorizontal: 18, paddingVertical: 16 }]}
            value={title}
          />

          <TextInput
            autoCorrect={false}
            className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            multiline
            numberOfLines={8}
            onChangeText={setBody}
            placeholder={t('manager.createNewsBodyPlaceholder')}
            style={textDirectionStyle}
            textAlignVertical="top"
            value={body}
          />

          {imageDraft ? (
            <View className="gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
              <View className="overflow-hidden rounded-[26px] border border-black/10 bg-[#edf4ff]">
                <Image
                  resizeMode="cover"
                  source={{ uri: imageDraft.previewUri }}
                  style={{
                    aspectRatio: imageAspectRatio,
                    width: '100%',
                  }}
                />
              </View>

              <View className="flex-row flex-wrap items-center gap-3">
                <PressableScale
                  className="rounded-full border border-[#f4b8b8] px-3 py-2"
                  haptic="selection"
                  onPress={() => setImageDraft(null)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons color="#dc2626" name="trash-outline" size={16} />
                    <Text className="text-[13px] font-medium text-[#dc2626]">
                      {t('manager.createNewsPhotoRemove')}
                    </Text>
                  </View>
                </PressableScale>

                <PressableScale
                  className="rounded-full border border-black/10 px-3 py-2"
                  haptic="selection"
                  onPress={() => openCropper(imageDraft.source)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons color="#111827" name="create-outline" size={16} />
                    <Text className="text-[13px] font-medium text-foreground">
                      {t('manager.createNewsEditImage')}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              className="rounded-[22px] border border-dashed border-black/12 bg-[#f8fbff] px-4 py-5"
              haptic="selection"
              onPress={openImageSourcePicker}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef3ff]">
                  <Ionicons color="#334155" name="image-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">
                    {t('manager.createNewsPhotoAdd')}
                  </Text>
                </View>
              </View>
            </PressableScale>
          )}

          <NewsOptionCheckbox
            checked={limitParticipants}
            label={t('manager.createNewsSelectedAudienceOnly')}
            onPress={() => setLimitParticipants((current) => !current)}
          />

          {limitParticipants ? (
            <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-bold text-foreground">
                  {t('manager.meetingParticipants')}
                </Text>
                <PressableScale
                  className="min-h-10 min-w-[92px] items-center justify-center rounded-full border border-[#d8e2f0] bg-white px-4"
                  haptic="selection"
                  onPress={() => setParticipantSheetOpen(true)}
                >
                  <Text className="text-[14px] font-semibold text-foreground">{`+ ${t('common.add')}`}</Text>
                </PressableScale>
              </View>

              {participantsLoading ? (
                <Text className="mt-4 text-[14px] text-muted-foreground">
                  {t('manager.meetingLoadingParticipants')}
                </Text>
              ) : selectedGroups.length > 0 || selectedParticipants.length > 0 ? (
                <View className="mt-4 gap-2">
                  <ParticipantAvatarStrip participants={selectedParticipants} />

                  {selectedGroups.map((group) => (
                    <View key={group.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">{group.name}</Text>
                        <Text className="text-[12px] text-muted-foreground">
                          {t('manager.groupMembersCount', { count: group.memberIds.length })}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {individuallySelectedEmployees.map((employee) => (
                    <View key={employee.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                        {employee.avatar ? (
                          <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
                        ) : (
                          <Text className="text-[12px] font-extrabold text-foreground">
                            {getEmployeeInitials(employee.firstName, employee.lastName)}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">
                          {employee.firstName} {employee.lastName}
                        </Text>
                        <Text className="text-[12px] text-muted-foreground">
                          {getEmployeeSubtitle(employee)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-[14px] leading-6 text-muted-foreground">
                  {t('manager.createNewsChooseAudience')}
                </Text>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[
            styles.submitButtonOverlay,
            {
              bottom: submitButtonBottom,
              paddingHorizontal: CREATE_NEWS_SUBMIT_BUTTON_SIDE_PADDING,
              transform: [{ translateY: CREATE_NEWS_SUBMIT_BUTTON_OFFSET }],
            },
          ]}
        >
          <CreateNewsSubmitButton
            disabled={submitting}
            label={t('manager.createNewsSubmit')}
            loadingLabel={t('manager.createNewsCreating')}
            onPress={() => void handleSubmit()}
            submitting={submitting}
          />
        </View>
      </View>

      <NewsImageCropperModal
        onApply={(draft) => setImageDraft(draft)}
        onClose={() => setCropVisible(false)}
        source={cropSource}
        visible={cropVisible}
      />

      <BottomSheetModal
        onClose={() => setParticipantSheetOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={participantSheetOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">
              {t('manager.meetingParticipantPickerTitle')}
            </Text>
          </View>
          <PressableScale
            className="h-10 min-w-[72px] items-center justify-center rounded-full px-3"
            haptic="selection"
            onPress={() => setParticipantSheetOpen(false)}
          >
            <Text className="text-[15px] font-semibold text-foreground">{t('common.done')}</Text>
          </PressableScale>
        </View>

        {participantsLoading ? (
          <Text className="text-[14px] text-muted-foreground">
            {t('manager.meetingLoadingParticipants')}
          </Text>
        ) : (
          <View className={shouldScrollParticipantSheet ? 'max-h-[440px]' : ''}>
            {shouldScrollParticipantSheet ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {groups.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                        {t('manager.meetingGroups')}
                      </Text>
                      {groups.map((group) => renderGroupBlock(group))}
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">
                      {t('manager.meetingNoGroups')}
                    </Text>
                  )}

                  {orderedEmployees.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                        {t('manager.meetingEmployees')}
                      </Text>
                      <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                        {orderedEmployees.map((employee, index) =>
                          renderEmployeeRow(employee, {
                            isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                            onPress: () => toggleEmployee(employee.id),
                            showDivider: index < orderedEmployees.length - 1,
                          }),
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">
                      {t('manager.meetingNoEmployees')}
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View className="gap-4">
                {groups.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                      {t('manager.meetingGroups')}
                    </Text>
                    {groups.map((group) => renderGroupBlock(group))}
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">
                    {t('manager.meetingNoGroups')}
                  </Text>
                )}

                {orderedEmployees.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                      {t('manager.meetingEmployees')}
                    </Text>
                    <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                      {orderedEmployees.map((employee, index) =>
                        renderEmployeeRow(employee, {
                          isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                          onPress: () => toggleEmployee(employee.id),
                          showDivider: index < orderedEmployees.length - 1,
                        }),
                      )}
                    </View>
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">
                    {t('manager.meetingNoEmployees')}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  optionBox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  optionBoxChecked: {
    backgroundColor: '#6d73ff',
    borderColor: '#6d73ff',
  },
  optionBoxUnchecked: {
    backgroundColor: '#ffffff',
    borderColor: '#bcc8da',
  },
  optionLabel: {
    color: '#243042',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  optionPressable: {
    justifyContent: 'center',
    minHeight: 28,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButtonOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
});

