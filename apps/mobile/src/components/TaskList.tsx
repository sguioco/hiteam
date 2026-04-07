import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import type { TaskItem } from '@smart/types';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { addMyTaskPhotoProof, deleteMyTaskPhotoProof } from '../../lib/api';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from './BottomSheetModal';

type TaskListProps = {
  loading?: boolean;
  tasks: TaskItem[];
  updatingTaskIds?: string[];
  onToggleTask?: (taskId: string, nextStatus: 'TODO' | 'DONE') => void;
  onTaskUpdate?: (task: TaskItem) => void;
};

type TaskPhoto = {
  id: string;
  label: string;
  capturedAt: string;
  uri: string;
  isPending?: boolean;
};

type PhotoSourceAction = 'add' | 'edit';

const taskTitleStyle = {
  fontFamily: 'Manrope_700Bold',
  letterSpacing: -0.28,
} as const;

const completedTitleStyle = {
  fontFamily: 'Manrope_600SemiBold',
  letterSpacing: -0.18,
} as const;

const sectionMetaStyle = {
  fontFamily: 'Manrope_600SemiBold',
  letterSpacing: 1,
} as const;

const PHOTO_REPORT_LAYOUT = {
  withoutPhotos: {
    shellClassName: 'min-h-[420px] relative',
    footerClassName: 'absolute inset-x-0 bottom-0 gap-3',
    addButtonClassName:
      'rounded-[24px] border border-white bg-[#ebf6ff] px-4 py-4',
  },
  withPhotos: {
    shellClassName: 'min-h-[610px] relative',
    footerClassName: 'absolute inset-x-0 bottom-2 gap-6',
    actionRowClassName: 'flex-row gap-3',
  },
} as const;

const PHOTO_REPORT_LIMIT = 7;


function normalizeTaskTitle(title: string) {
  const normalized = title
    .replace(/^(Employee recurring|Повторяющаяся задача сотрудника):\s*/i, '')
    .replace(/^(Owner recurring|Повторяющаяся задача владельца):\s*/i, '')
    .trim();

  if (!normalized) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildTaskPhotos(task: TaskItem, locale: string, t: (key: string, vars?: any) => string): TaskPhoto[] {
  return task.photoProofs
    .filter((proof) => !proof.deletedAt && !proof.supersededByProofId && proof.url)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map((proof, index) => ({
      id: proof.id,
      label: t('today.photoLabel', { index: String(index + 1) }),
      capturedAt: new Date(proof.createdAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      uri: proof.url ?? '',
    }));
}

export default function TaskList({
  loading = false,
  tasks,
  updatingTaskIds = [],
  onToggleTask,
  onTaskUpdate,
}: TaskListProps) {
  const { language, t, tp, tc } = useI18n();
  const locale = getDateLocale(language);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoSourceAction, setPhotoSourceAction] = useState<PhotoSourceAction>('add');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [pendingPhotosByTaskId, setPendingPhotosByTaskId] = useState<Record<string, TaskPhoto[]>>({});

  const activeTasks = tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED');
  const completedTasks = tasks.filter((task) => task.status === 'DONE');
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const taskPhotos = useMemo(
    () =>
      Object.fromEntries(tasks.map((task) => [task.id, buildTaskPhotos(task, locale, t)])) as Record<
        string,
        TaskPhoto[]
      >,
    [locale, t, tasks],
  );
  const activeTaskPhotos = useMemo(() => {
    if (!activeTask) {
      return [];
    }

    return [
      ...(taskPhotos[activeTask.id] ?? []),
      ...(pendingPhotosByTaskId[activeTask.id] ?? []),
    ];
  }, [activeTask, pendingPhotosByTaskId, taskPhotos]);
  const selectedPhoto = activeTaskPhotos.find((photo) => photo.id === selectedPhotoId) ?? activeTaskPhotos[0] ?? null;
  const activeTaskHasPhotos = activeTaskPhotos.length > 0;
  const photoReportLayout = activeTaskHasPhotos
    ? PHOTO_REPORT_LAYOUT.withPhotos
    : PHOTO_REPORT_LAYOUT.withoutPhotos;

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

  const totalCountLabel = useMemo(() => `${tasks.length}`, [tasks.length]);

  function photoLimitErrorMessage() {
    return t('today.photoLimitError', { limit: 7 });
  }

  function closeTaskModal() {
    hapticSelection();
    setMediaError(null);
    setActiveTaskId(null);
  }

  function openTask(taskId: string) {
    hapticSelection();
    setActiveTaskId(taskId);
    setMediaError(null);
  }

  function openPhotoSourceChooser(taskId: string, action: PhotoSourceAction) {
    hapticSelection();
    setActiveTaskId(taskId);
    setPhotoSourceAction(action);
    setMediaError(null);

    if (action === 'add' && (taskPhotos[taskId]?.length ?? 0) >= PHOTO_REPORT_LIMIT) {
      hapticError();
      setMediaError(photoLimitErrorMessage());
      return;
    }

    const options = [
      {
        label: t('today.chooseFromLibrary'),
        run: () => {
          void pickFromLibrary();
        },
      },
      {
        label: t('today.takePhotoNow'),
        run: () => {
          void pickFromCamera();
        },
      },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...options.map((option) => option.label)],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          const actionOption = options[buttonIndex - 1];
          actionOption?.run();
        },
      );
      return;
    }

    Alert.alert(t('today.addPhoto'), undefined, [
      ...options.map((option) => ({
        text: option.label,
        onPress: option.run,
      })),
      {
        text: t('common.cancel'),
        style: 'cancel' as const,
      },
    ]);
  }

  async function uploadPhotoAsset(asset: ImagePicker.ImagePickerAsset, action: PhotoSourceAction) {
    if (!activeTask?.id) {
      return;
    }

    const currentPhotos = [
      ...(taskPhotos[activeTask.id] ?? []),
      ...(pendingPhotosByTaskId[activeTask.id] ?? []),
    ];
    if (action === 'add' && currentPhotos.length >= PHOTO_REPORT_LIMIT) {
      hapticError();
      setMediaError(photoLimitErrorMessage());
      return;
    }

    const pendingPhotoId = `pending:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const pendingPhoto: TaskPhoto = {
      id: pendingPhotoId,
      label: t('today.photoLabel', { index: String(currentPhotos.length + 1) }),
      capturedAt: new Date().toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      uri: asset.uri,
      isPending: true,
    };

    if (action === 'add') {
      setPendingPhotosByTaskId((current) => ({
        ...current,
        [activeTask.id]: [...(current[activeTask.id] ?? []), pendingPhoto],
      }));
      setSelectedPhotoId(pendingPhotoId);
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileExtension = mimeType.split('/')[1] ?? 'jpg';
      const fileName = asset.fileName?.trim() || `task-photo-${Date.now()}.${fileExtension}`;
      const updatedTask = await addMyTaskPhotoProof(activeTask.id, {
        action: action === 'edit' ? 'replace' : 'add',
        fileName,
        dataUrl: `data:${mimeType};base64,${base64}`,
        ...(action === 'edit' && selectedPhotoId ? { targetProofId: selectedPhotoId } : {}),
      });

      setPendingPhotosByTaskId((current) => {
        const nextTaskPhotos = (current[activeTask.id] ?? []).filter((photo) => photo.id !== pendingPhotoId);

        if (nextTaskPhotos.length === 0) {
          const { [activeTask.id]: _removed, ...rest } = current;
          return rest;
        }

        return {
          ...current,
          [activeTask.id]: nextTaskPhotos,
        };
      });

      onTaskUpdate?.(updatedTask);

      const nextPhotos = buildTaskPhotos(updatedTask, locale, t);
      const nextSelected = nextPhotos[nextPhotos.length - 1] ?? null;

      setSelectedPhotoId(nextSelected?.id ?? null);
      hapticSuccess();
    } catch (error) {
      if (action === 'add') {
        setPendingPhotosByTaskId((current) => {
          const nextTaskPhotos = (current[activeTask.id] ?? []).filter((photo) => photo.id !== pendingPhotoId);

          if (nextTaskPhotos.length === 0) {
            const { [activeTask.id]: _removed, ...rest } = current;
            return rest;
          }

          return {
            ...current,
            [activeTask.id]: nextTaskPhotos,
          };
        });
      }

      throw error;
    }
  }

  async function pickFromCamera() {
    try {
      setMediaBusy(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        hapticError();
        setMediaError(t('today.photoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.72,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      await uploadPhotoAsset(result.assets[0], photoSourceAction);
    } catch (error) {
      hapticError();
      setMediaError(error instanceof Error ? error.message : t('today.photoCaptureFailed'));
    } finally {
      setMediaBusy(false);
    }
  }

  async function pickFromLibrary() {
    try {
      setMediaBusy(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        hapticError();
        setMediaError(t('today.photoLibraryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.72,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      await uploadPhotoAsset(result.assets[0], photoSourceAction);
    } catch (error) {
      hapticError();
      setMediaError(error instanceof Error ? error.message : t('today.photoSelectionFailed'));
    } finally {
      setMediaBusy(false);
    }
  }

  async function completePhotoTask(taskId: string) {
    if (!activeTaskHasPhotos) {
      return;
    }

    hapticSuccess();
    await onToggleTask?.(taskId, 'DONE');
    setActiveTaskId(null);
  }

  async function deleteSelectedPhoto() {
    if (!activeTask || !selectedPhoto) {
      return;
    }

    hapticSelection();
    setMediaError(null);

    try {
      setMediaBusy(true);
      const currentPhotos = taskPhotos[activeTask.id] ?? [];
      const currentIndex = currentPhotos.findIndex((photo) => photo.id === selectedPhoto.id);
      const updatedTask = await deleteMyTaskPhotoProof(activeTask.id, selectedPhoto.id);
      onTaskUpdate?.(updatedTask);

      const nextPhotos = buildTaskPhotos(updatedTask, locale, t);
      const nextSelected =
        nextPhotos[currentIndex] ?? nextPhotos[currentIndex - 1] ?? nextPhotos[0] ?? null;
      setSelectedPhotoId(nextSelected?.id ?? null);
    } catch (error) {
      hapticError();
      setMediaError(error instanceof Error ? error.message : t('today.photoSelectionFailed'));
    } finally {
      setMediaBusy(false);
    }
  }

  function reopenRegularTask(taskId: string) {
    hapticSelection();
    void onToggleTask?.(taskId, 'TODO');
  }

  function handleTaskRowPress(task: TaskItem) {
    if (task.requiresPhoto) {
      openTask(task.id);
      return;
    }

    void onToggleTask?.(task.id, task.status === 'DONE' ? 'TODO' : 'DONE');
  }

  function renderLeading(task: TaskItem) {
    const completed = task.status === 'DONE';
    const hasPhotos = (taskPhotos[task.id]?.length ?? 0) > 0;

    if (task.requiresPhoto) {
      const iconColor = completed ? '#22a55b' : hasPhotos ? '#6d73ff' : '#6b7a90';

      return (
        <View className="h-8 w-8 shrink-0 items-center justify-center">
          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${
              completed ? 'bg-[#dcfce7]' : 'bg-white'
            }`}
            style={{ borderWidth: 1.5, borderColor: completed ? '#7fd59b' : '#d6def5' }}
          >
            <Ionicons color={iconColor} name="camera-outline" size={15} />
          </View>
        </View>
      );
    }

    if (completed) {
      return (
        <View className="h-8 w-8 shrink-0 items-center justify-center">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#e8fbef]">
            <Ionicons color="#1fa160" name="checkmark" size={18} />
          </View>
        </View>
      );
    }

    return (
      <View className="h-8 w-8 shrink-0 items-center justify-center">
        <View className="h-6 w-6 rounded-full border border-[#cfd7eb] bg-white" />
      </View>
    );
  }

  function renderTaskRow(task: TaskItem, index: number, completed = false) {
    const title = tc(normalizeTaskTitle(task.title));
    const isUpdating = updatingTaskIds.includes(task.id);
    const photoCount =
      (taskPhotos[task.id]?.length ?? 0) +
      (pendingPhotosByTaskId[task.id]?.length ?? 0);

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 28).duration(170).withInitialValues({
          opacity: 0,
          transform: [{ translateY: 8 }],
        })}
        key={task.id}
        layout={LinearTransition.duration(180)}
      >
        <PressableScale
          className={`min-h-[78px] flex-row items-center gap-3 px-5 py-3.5 ${isUpdating ? 'opacity-60' : ''}`}
          disabled={isUpdating}
          haptic={task.requiresPhoto ? 'selection' : completed ? 'selection' : 'success'}
          onPress={() => handleTaskRowPress(task)}
        >
          {renderLeading(task)}
          <View className="flex-1 justify-center">
            <Text
              className={`text-[18px] leading-[23px] ${
                completed ? 'text-[#7f8ba3] line-through' : 'text-[#172033]'
              }`}
              style={completed ? completedTitleStyle : taskTitleStyle}
            >
              {title}
            </Text>
            {task.requiresPhoto ? (
              <Text className={`mt-1 text-[11px] ${completed ? 'text-[#8fa1bb]' : 'text-[#94a3b8]'}`}>
                {completed && photoCount > 0
                  ? t('today.photosSaved', { count: photoCount })
                  : photoCount > 0
                    ? t('today.photosAttached', { count: photoCount })
                    : t('today.photoProofRequired')}
              </Text>
            ) : null}
          </View>
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <>
      <View className="space-y-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[13px] uppercase text-foreground" style={sectionMetaStyle}>
            {t('today.taskList')}
          </Text>
          <Text className="text-sm text-muted-foreground" style={sectionMetaStyle}>
            {loading ? '...' : totalCountLabel}
          </Text>
        </View>

        {loading ? (
          <View className="overflow-hidden rounded-[28px] bg-white/72 px-5 py-5">
            <Text className="font-body text-sm text-muted-foreground">{t('common.loading')}</Text>
          </View>
        ) : tasks.length > 0 ? (
          <View className="overflow-hidden rounded-[28px] bg-white">
            {activeTasks.map((task, index) => (
              <View key={task.id}>
                {renderTaskRow(task, index)}
                {index < activeTasks.length - 1 ? <View className="ml-14 h-px bg-[#edf1f7]" /> : null}
              </View>
            ))}

            {completedTasks.length > 0 ? (
              <>
                {activeTasks.length > 0 ? <View className="mx-5 mt-1 h-px bg-[#edf1f7]" /> : null}
                <View className="px-5 pb-2 pt-4">
                  <Text className="text-[12px] uppercase text-[#8a96ab]" style={sectionMetaStyle}>
                    {t('today.completedSection')} ({completedTasks.length})
                  </Text>
                </View>
                {completedTasks.map((task, index) => (
                  <View key={task.id}>
                    {renderTaskRow(task, index, true)}
                    {index < completedTasks.length - 1 ? <View className="ml-14 h-px bg-[#edf1f7]" /> : null}
                  </View>
                ))}
              </>
            ) : null}
          </View>
        ) : (
          <View className="overflow-hidden rounded-[28px] bg-white/72 px-5 py-5">
            <Text className="font-body text-sm text-muted-foreground">{t('calendar.noTasksForDay')}</Text>
          </View>
        )}
      </View>

      <BottomSheetModal
        onClose={closeTaskModal}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-6 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={activeTask !== null}
      >
        {activeTask ? (
          <View className={photoReportLayout.shellClassName}>
            <View className={activeTaskHasPhotos ? 'pb-24' : 'pb-24'}>
              <View className="mb-4 flex-row items-start justify-between gap-4">
                <View className="w-10" />
                <View className="flex-1 items-center">
                  <Text className="text-center font-display text-[24px] font-bold text-foreground">
                    {t('today.photoReportTitle')}
                  </Text>
                  <Text className="mt-1 text-center font-body text-sm leading-6 text-muted-foreground">
                    {t('today.photoDefaultHint')}
                  </Text>
                </View>
                <PressableScale
                  className="h-8 w-8 items-center justify-center"
                  haptic="selection"
                  onPress={closeTaskModal}
                >
                  <Ionicons color="#111827" name="close" size={18} />
                </PressableScale>
              </View>

              {mediaError ? (
                <View className="mb-4 rounded-[22px] border border-[#ffd7dc] bg-[#fff1f3] px-4 py-3">
                  <Text className="font-body text-sm leading-6 text-[#9f1239]">{mediaError}</Text>
                </View>
              ) : null}

              <View>
                {activeTaskHasPhotos ? (
                  <View className="mb-4 h-9">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-2">
                        {activeTaskPhotos.map((photo, index) => {
                          const isSelected = selectedPhoto?.id === photo.id;

                          return (
                            <PressableScale
                              key={photo.id}
                              className={`h-9 w-9 items-center justify-center rounded-full border ${
                                isSelected ? 'border-primary bg-primary' : 'border-[#d7def5] bg-white'
                              }`}
                              haptic="selection"
                              onPress={() => setSelectedPhotoId(photo.id)}
                            >
                              {photo.isPending ? (
                                <ActivityIndicator
                                  color={isSelected ? '#ffffff' : '#6d73ff'}
                                  size="small"
                                />
                              ) : (
                                <Text
                                  className={`font-display text-sm font-bold ${
                                    isSelected ? 'text-white' : 'text-foreground'
                                  }`}
                                >
                                  {index + 1}
                                </Text>
                              )}
                            </PressableScale>
                          );
                        })}
                        <PressableScale
                          className="h-9 w-9 items-center justify-center rounded-full border border-[#d7def5] bg-white"
                          haptic="selection"
                          onPress={() => openPhotoSourceChooser(activeTask.id, 'add')}
                        >
                          <Ionicons color="#6d73ff" name="add" size={18} />
                        </PressableScale>
                      </View>
                    </ScrollView>
                  </View>
                ) : null}

                {selectedPhoto ? (
                  <View className="mb-1 aspect-square overflow-hidden rounded-[26px] bg-[#dbe7ff]">
                    <Image source={{ uri: selectedPhoto.uri }} style={StyleSheet.absoluteFillObject} />
                    {selectedPhoto.isPending ? (
                      <View className="absolute inset-0 items-center justify-center bg-[#0f172a]/18">
                        <View className="items-center gap-3 rounded-[22px] bg-white/88 px-5 py-4">
                          <ActivityIndicator color="#546cf2" size="large" />
                          <Text className="font-body text-sm text-[#24314b]">
                            {t('today.uploadingPhoto')}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <PressableScale
                        className="absolute right-4 top-4 h-8 w-8 items-center justify-center"
                        disabled={mediaBusy}
                        haptic="selection"
                        onPress={() => {
                          void deleteSelectedPhoto();
                        }}
                      >
                        <Ionicons color="#ffffff" name="close" size={16} />
                      </PressableScale>
                    )}
                    <View
                      className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-6"
                      style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}
                    >
                      <Text className="font-display text-[28px] font-bold text-white">
                        {selectedPhoto.label}
                      </Text>
                      <Text className="mt-2 font-body text-sm text-white/90">
                        {selectedPhoto.isPending
                          ? t('today.uploading')
                          : t('today.photoCapturedAt', { time: selectedPhoto.capturedAt })}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <PressableScale
                    className="mb-4 items-center rounded-[26px] border border-dashed border-primary/20 bg-white px-5 py-10"
                    haptic="selection"
                    onPress={() => openPhotoSourceChooser(activeTask.id, 'add')}
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Ionicons color="#6d73ff" name="camera-outline" size={24} />
                    </View>
                    <Text className="mt-4 font-display text-[20px] font-bold text-foreground">
                      {t('today.noPhotosYet')}
                    </Text>
                    <Text className="mt-2 text-center font-body text-sm leading-6 text-muted-foreground">
                      {t('today.addPhotoBeforeDone')}
                    </Text>
                  </PressableScale>
                )}
              </View>
            </View>

            <View className={photoReportLayout.footerClassName}>
              {!activeTaskHasPhotos ? (
                <PressableScale
                  className={PHOTO_REPORT_LAYOUT.withoutPhotos.addButtonClassName}
                  disabled={mediaBusy}
                  haptic="selection"
                  onPress={() => openPhotoSourceChooser(activeTask.id, 'add')}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Ionicons color="#2563eb" name="camera-outline" size={18} />
                    <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                      {t('today.addPhoto')}
                    </Text>
                  </View>
                </PressableScale>
              ) : activeTask.status === 'DONE' ? (
                <View className={PHOTO_REPORT_LAYOUT.withPhotos.actionRowClassName}>
                  <PressableScale
                    className="flex-1 min-h-[56px] rounded-[24px] border border-[#d8e5ff] bg-[#eef5ff] px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="selection"
                    onPress={() => openPhotoSourceChooser(activeTask.id, 'edit')}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Ionicons color="#2563eb" name="create-outline" size={18} />
                      <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                        {t('today.editPhotos')}
                      </Text>
                    </View>
                  </PressableScale>
                  <PressableScale
                    className="flex-1 min-h-[56px] rounded-[24px] border border-[#d8deea] bg-white px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="selection"
                    onPress={() => {
                      reopenRegularTask(activeTask.id);
                      setActiveTaskId(null);
                    }}
                  >
                    <Text className="text-center font-display text-[16px] font-semibold text-[#11233d]">
                      {t('today.taskReopen')}
                    </Text>
                  </PressableScale>
                </View>
              ) : (
                <View className={PHOTO_REPORT_LAYOUT.withPhotos.actionRowClassName}>
                  <PressableScale
                    className="flex-1 min-h-[56px] rounded-[24px] border border-[#d8e5ff] bg-[#eef5ff] px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="selection"
                    onPress={() => openPhotoSourceChooser(activeTask.id, 'edit')}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Ionicons color="#2563eb" name="create-outline" size={18} />
                      <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                        {t('today.editPhotos')}
                      </Text>
                    </View>
                  </PressableScale>

                  <PressableScale
                    className="flex-1 min-h-[56px] rounded-[24px] bg-primary px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="success"
                    onPress={() => void completePhotoTask(activeTask.id)}
                  >
                    <Text className="text-center font-display text-[16px] font-semibold text-white">
                      {t('today.taskDone')}
                    </Text>
                  </PressableScale>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </BottomSheetModal>

    </>
  );
}
