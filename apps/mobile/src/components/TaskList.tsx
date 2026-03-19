import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from './BottomSheetModal';

type TaskPhoto = {
  id: string;
  label: string;
  capturedAt: string;
  uri: string;
};

interface Task {
  id: string;
  title: string;
  completed: boolean;
  requiresPhoto?: boolean;
  photoDescription?: string;
  photos?: TaskPhoto[];
}

type PhotoSourceAction = 'add' | 'edit';

const taskTitleStyle = {
  fontFamily: 'Manrope_700Bold',
  letterSpacing: -0.35,
} as const;

const sectionMetaStyle = {
  fontFamily: 'Manrope_600SemiBold',
  letterSpacing: 1,
} as const;

const initialTasks: Task[] = [
  { id: '1', title: 'Create a presentation in Keynote', completed: false },
  {
    id: '2',
    title: 'Give feedback to the team',
    completed: false,
    requiresPhoto: true,
    photoDescription: 'Take a clear photo of the printed feedback form after you leave it on the manager desk.',
    photos: [],
  },
  { id: '3', title: 'Book the return tickets', completed: true },
  {
    id: '4',
    title: 'Check some guided tours',
    completed: true,
    requiresPhoto: true,
    photoDescription: 'Photograph the final list of approved tours and the brochure wall after the update.',
    photos: [],
  },
];

function buildPhoto(taskId: string, count: number, locale: string, uri: string): TaskPhoto {
  const capturedAt = new Date().toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    id: `${taskId}-${Date.now()}-${count}`,
    label: `Photo ${count}`,
    capturedAt,
    uri,
  };
}

const TaskList = () => {
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showCompleted, setShowCompleted] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoSourceSheetOpen, setPhotoSourceSheetOpen] = useState(false);
  const [photoSourceAction, setPhotoSourceAction] = useState<PhotoSourceAction>('add');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dirtyCompletedTaskIds, setDirtyCompletedTaskIds] = useState<string[]>([]);

  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeTaskHasPhotos = (activeTask?.photos?.length ?? 0) > 0;
  const selectedPhoto =
    activeTask?.photos?.find((photo) => photo.id === selectedPhotoId) ??
    activeTask?.photos?.[0] ??
    null;
  const activeTaskDescription = activeTask?.photoDescription ?? t('today.photoDefaultHint');
  const activeTaskIsDirty = activeTask ? dirtyCompletedTaskIds.includes(activeTask.id) : false;

  useEffect(() => {
    if (!activeTask?.photos?.length) {
      setSelectedPhotoId(null);
      return;
    }

    setSelectedPhotoId((current) => {
      if (current && activeTask.photos?.some((photo) => photo.id === current)) {
        return current;
      }

      return activeTask.photos?.[0]?.id ?? null;
    });
  }, [activeTask]);

  const completionText = useMemo(() => `${completed.length}/${tasks.length}`, [completed.length, tasks.length]);

  function markCompletedTaskDirty(taskId: string) {
    setDirtyCompletedTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId]));
  }

  function clearCompletedTaskDirty(taskId: string) {
    setDirtyCompletedTaskIds((current) => current.filter((id) => id !== taskId));
  }

  function closeTaskModal() {
    hapticSelection();
    setPhotoSourceSheetOpen(false);
    setMediaError(null);
    setActiveTaskId(null);
  }

  function toggleTask(id: string) {
    const nextCompleted = !tasks.find((task) => task.id === id)?.completed;
    if (nextCompleted) {
      hapticSuccess();
    } else {
      hapticSelection();
    }

    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
    clearCompletedTaskDirty(id);
  }

  function openTask(taskId: string) {
    hapticSelection();
    setActiveTaskId(taskId);
    setPhotoSourceSheetOpen(false);
    setMediaError(null);
  }

  function openPhotoSourceSheet(taskId: string, action: PhotoSourceAction) {
    hapticSelection();
    setActiveTaskId(taskId);
    setPhotoSourceAction(action);
    setPhotoSourceSheetOpen(true);
    setMediaError(null);
  }

  function closePhotoSourceSheet() {
    hapticSelection();
    setPhotoSourceSheetOpen(false);
  }

  function applyPhoto(uri: string, action: PhotoSourceAction) {
    if (!activeTask) {
      return;
    }

    const nextCount = (activeTask.photos?.length ?? 0) + 1;
    const nextPhoto = buildPhoto(activeTask.id, nextCount, locale, uri);

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== activeTask.id) {
          return task;
        }

        const currentPhotos = task.photos ?? [];
        const nextPhotos =
          action === 'edit' && currentPhotos.length > 0
            ? currentPhotos.map((photo) =>
                photo.id === (selectedPhotoId ?? currentPhotos[0]?.id)
                  ? {
                      ...nextPhoto,
                      id: photo.id,
                      label: photo.label,
                    }
                  : photo,
              )
            : [...currentPhotos, nextPhoto];

        return {
          ...task,
          photos: nextPhotos,
        };
      }),
    );

    if (action === 'edit' && selectedPhotoId) {
      setSelectedPhotoId(selectedPhotoId);
    } else {
      setSelectedPhotoId(nextPhoto.id);
    }

    if (activeTask.completed) {
      markCompletedTaskDirty(activeTask.id);
    }

    setPhotoSourceSheetOpen(false);
    hapticSuccess();
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

      applyPhoto(result.assets[0].uri, photoSourceAction);
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

      applyPhoto(result.assets[0].uri, photoSourceAction);
    } catch (error) {
      hapticError();
      setMediaError(error instanceof Error ? error.message : t('today.photoSelectionFailed'));
    } finally {
      setMediaBusy(false);
    }
  }

  function markTaskDone(taskId: string) {
    hapticSuccess();
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, completed: true } : task)));
    clearCompletedTaskDirty(taskId);
    setPhotoSourceSheetOpen(false);
    setActiveTaskId(null);
  }

  function saveCompletedTask(taskId: string) {
    hapticSuccess();
    clearCompletedTaskDirty(taskId);
    setPhotoSourceSheetOpen(false);
    setActiveTaskId(null);
  }

  function reopenTask(taskId: string) {
    hapticSelection();
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, completed: false } : task)));
    clearCompletedTaskDirty(taskId);
  }

  function handleTaskRowPress(task: Task) {
    if (task.requiresPhoto) {
      openTask(task.id);
      return;
    }

    if (task.completed) {
      reopenTask(task.id);
      return;
    }

    toggleTask(task.id);
  }

  function renderLeading(task: Task) {
    if (task.requiresPhoto) {
      const hasPhotos = (task.photos?.length ?? 0) > 0;
      const iconColor = task.completed ? '#10b981' : hasPhotos ? '#6d73ff' : '#6b7a90';

      return (
        <PressableScale className="h-9 w-9 items-center justify-center" haptic="selection" onPress={() => openTask(task.id)}>
          <Ionicons color={iconColor} name="camera-outline" size={24} />
        </PressableScale>
      );
    }

    if (task.completed) {
      return (
        <PressableScale className="h-9 w-9 items-center justify-center rounded-full bg-success/12" haptic="success" onPress={() => toggleTask(task.id)}>
          <Ionicons color="#10b981" name="checkmark" size={20} />
        </PressableScale>
      );
    }

    return <PressableScale className="h-9 w-9 rounded-full border-2 border-[#d8dee8]" haptic="selection" onPress={() => toggleTask(task.id)} />;
  }

  return (
    <>
      <View className="space-y-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[13px] uppercase text-foreground" style={sectionMetaStyle}>
            {t('today.taskList')}
          </Text>
          <Text className="text-sm text-muted-foreground" style={sectionMetaStyle}>{completionText}</Text>
        </View>

        <View className="overflow-hidden rounded-[28px] bg-white">
          {pending.map((task, index) => (
            <Animated.View
              entering={FadeInUp.delay(index * 28).duration(170).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 8 }],
              })}
              key={task.id}
              layout={LinearTransition.duration(180)}
            >
              <PressableScale
                className="flex-row items-center gap-4 px-1 py-4"
                haptic={task.requiresPhoto ? 'selection' : task.completed ? 'selection' : 'success'}
                onPress={() => handleTaskRowPress(task)}
              >
                {renderLeading(task)}
                <View className="flex-1">
                  <Text className="text-[19px] text-[#172033]" style={taskTitleStyle}>
                    {task.title}
                  </Text>
                  {task.requiresPhoto ? (
                    <Text className="mt-1 font-body text-sm text-muted-foreground">
                      {(task.photos?.length ?? 0) > 0
                        ? t('today.photosAttached', { count: task.photos?.length ?? 0 })
                        : t('today.photoProofRequired')}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>
              {index < pending.length - 1 ? <View className="ml-13 h-px bg-[#edf1f7]" /> : null}
            </Animated.View>
          ))}
        </View>

        {completed.length > 0 ? (
          <View className="pt-2">
            <PressableScale
              className="mb-2 flex-row items-center gap-2"
              haptic="selection"
              onPress={() => setShowCompleted((value) => !value)}
            >
              <Text className="text-[13px] uppercase text-muted-foreground" style={sectionMetaStyle}>{t('today.completedSection')} ({completed.length})</Text>
              <Ionicons color="#6b7a90" name={showCompleted ? 'chevron-up' : 'chevron-down'} size={14} />
            </PressableScale>

            {showCompleted ? (
              <View className="overflow-hidden rounded-[28px] bg-white/72">
                {completed.map((task, index) => (
                  <Animated.View
                    entering={FadeInUp.delay(index * 24).duration(160).withInitialValues({
                      opacity: 0,
                      transform: [{ translateY: 6 }],
                    })}
                    key={task.id}
                    layout={LinearTransition.duration(180)}
                  >
                    <PressableScale
                      className="flex-row items-center gap-4 px-1 py-4 opacity-85"
                      haptic="selection"
                      onPress={() => handleTaskRowPress(task)}
                    >
                      {renderLeading(task)}
                      <View className="flex-1">
                        <Text className="text-[18px] text-foreground/55 line-through" style={taskTitleStyle}>
                          {task.title}
                        </Text>
                        {task.requiresPhoto ? (
                          <Text className="mt-1 font-body text-sm text-muted-foreground">
                            {t('today.photosSaved', { count: task.photos?.length ?? 0 })}
                          </Text>
                        ) : null}
                      </View>
                    </PressableScale>
                    {index < completed.length - 1 ? <View className="ml-13 h-px bg-[#edf1f7]" /> : null}
                  </Animated.View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <BottomSheetModal
        onClose={closeTaskModal}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={activeTask !== null}
      >
        {activeTask ? (
          <View>
            <View className="mb-4 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-display text-[24px] font-bold text-foreground">{activeTask.title}</Text>
                <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
                  {activeTaskDescription}
                </Text>
              </View>
              <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-muted/80" haptic="selection" onPress={closeTaskModal}>
                <Ionicons color="#111827" name="close" size={18} />
              </PressableScale>
            </View>

            <View className="mb-4 self-start rounded-full border border-white bg-primary/10 px-3 py-1.5">
              <Text className="font-body text-xs font-semibold text-primary">{t('today.photoProofTask')}</Text>
            </View>

            {mediaError ? (
              <View className="mb-4 rounded-[22px] border border-[#ffd7dc] bg-[#fff1f3] px-4 py-3">
                <Text className="font-body text-sm leading-6 text-[#9f1239]">{mediaError}</Text>
              </View>
            ) : null}

            <View className="rounded-[28px] border border-white bg-[#f4f7ff] p-4">
              {activeTaskHasPhotos ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="mb-4 flex-row gap-2">
                    {activeTask.photos?.map((photo, index) => {
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
                          <Text className={`font-display text-sm font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                            {index + 1}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : null}

              {selectedPhoto ? (
                <View className="mb-1 aspect-square overflow-hidden rounded-[26px] bg-[#dbe7ff]">
                  <Image source={{ uri: selectedPhoto.uri }} style={StyleSheet.absoluteFillObject} />
                  <View className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-6" style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}>
                    <Text className="font-display text-[28px] font-bold text-white">{selectedPhoto.label}</Text>
                    <Text className="mt-2 font-body text-sm text-white/90">{t('today.photoCapturedAt', { time: selectedPhoto.capturedAt })}</Text>
                  </View>
                </View>
              ) : (
                <PressableScale
                  className="mb-4 items-center rounded-[26px] border border-dashed border-primary/20 bg-white px-5 py-10"
                  haptic="selection"
                  onPress={() => openPhotoSourceSheet(activeTask.id, 'add')}
                >
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons color="#6d73ff" name="camera-outline" size={24} />
                  </View>
                  <Text className="mt-4 font-display text-[20px] font-bold text-foreground">{t('today.noPhotosYet')}</Text>
                  <Text className="mt-2 text-center font-body text-sm leading-6 text-muted-foreground">
                    {t('today.addPhotoBeforeDone')}
                  </Text>
                </PressableScale>
              )}
            </View>

            <View className="mt-5 gap-3">
              {!activeTaskHasPhotos ? (
                <PressableScale
                  className="rounded-[24px] border border-white bg-[#ebf6ff] px-4 py-4"
                  disabled={mediaBusy}
                  haptic="selection"
                  onPress={() => openPhotoSourceSheet(activeTask.id, 'add')}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Ionicons color="#2563eb" name="camera-outline" size={18} />
                    <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                      {t('today.addPhoto')}
                    </Text>
                  </View>
                </PressableScale>
              ) : activeTask.completed ? (
                <PressableScale
                  className={`rounded-[24px] px-4 py-4 ${activeTaskIsDirty ? 'bg-primary' : 'border border-white bg-[#ebf6ff]'}`}
                  disabled={mediaBusy}
                  haptic={activeTaskIsDirty ? 'success' : 'selection'}
                  onPress={() => {
                    if (activeTaskIsDirty) {
                      saveCompletedTask(activeTask.id);
                      return;
                    }

                    openPhotoSourceSheet(activeTask.id, 'edit');
                  }}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Ionicons color={activeTaskIsDirty ? '#ffffff' : '#2563eb'} name={activeTaskIsDirty ? 'checkmark' : 'create-outline'} size={18} />
                    <Text className={`font-display text-[16px] font-semibold ${activeTaskIsDirty ? 'text-white' : 'text-[#11233d]'}`}>
                      {activeTaskIsDirty ? t('common.save') : t('today.editPhotos')}
                    </Text>
                  </View>
                </PressableScale>
              ) : (
                <View className="flex-row gap-3">
                  <PressableScale
                    className="flex-1 rounded-[24px] border border-white bg-[#ebf6ff] px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="selection"
                    onPress={() => openPhotoSourceSheet(activeTask.id, 'edit')}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Ionicons color="#2563eb" name="create-outline" size={18} />
                      <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                        {t('today.editPhotos')}
                      </Text>
                    </View>
                  </PressableScale>

                  <PressableScale
                    className="flex-1 rounded-[24px] bg-primary px-4 py-4"
                    containerClassName="flex-1"
                    disabled={mediaBusy}
                    haptic="success"
                    onPress={() => markTaskDone(activeTask.id)}
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

      <BottomSheetModal
        backdropOpacity={0.28}
        onClose={closePhotoSourceSheet}
        sheetClassName="rounded-t-[28px] border border-white bg-[#f7faff] px-5 pb-6 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={photoSourceSheetOpen}
      >
        <View className="gap-3">
          <PressableScale
            className="rounded-[22px] border border-white bg-white px-4 py-4"
            disabled={mediaBusy}
            haptic="selection"
            onPress={() => {
              void pickFromCamera();
            }}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons color="#2563eb" name="camera-outline" size={18} />
              <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                {t('today.takePhotoNow')}
              </Text>
            </View>
          </PressableScale>

          <PressableScale
            className="rounded-[22px] border border-white bg-white px-4 py-4"
            disabled={mediaBusy}
            haptic="selection"
            onPress={() => {
              void pickFromLibrary();
            }}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons color="#2563eb" name="images-outline" size={18} />
              <Text className="font-display text-[16px] font-semibold text-[#11233d]">
                {t('today.chooseFromLibrary')}
              </Text>
            </View>
          </PressableScale>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default TaskList;
