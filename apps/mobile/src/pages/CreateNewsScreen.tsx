import { useMemo, useState } from 'react';
import { AnnouncementImageAspectRatio } from '@smart/types';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import { createManagerAnnouncement } from '../../lib/api';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import {
  NewsImageCropperModal,
  type NewsImageDraft,
  type NewsImageSource,
} from '../components/news-image-cropper-modal';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';

type NewsOptionCheckboxProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

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

export default function CreateNewsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageDraft, setImageDraft] = useState<NewsImageDraft | null>(null);
  const [cropSource, setCropSource] = useState<NewsImageSource | null>(null);
  const [cropVisible, setCropVisible] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] =
    useState<AnnouncementImageAspectRatio>('16:9');

  const imageAspectRatio = useMemo(
    () => announcementAspectRatioToNumber(imageDraft?.aspectRatio),
    [imageDraft?.aspectRatio],
  );

  function openCropper(
    source: NewsImageSource,
    aspectRatio: AnnouncementImageAspectRatio = imageDraft?.aspectRatio ?? '16:9',
  ) {
    setCropSource(source);
    setCropAspectRatio(aspectRatio);
    setCropVisible(true);
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

    setSubmitting(true);

    try {
      await createManagerAnnouncement({
        title: title.trim(),
        body: body.trim(),
        isPinned,
        ...(imageDraft
          ? {
              imageAspectRatio: imageDraft.aspectRatio,
              imageDataUrl: imageDraft.dataUrl,
            }
          : {}),
      });

      hapticSuccess();
      Alert.alert('Success', t('manager.createNewsCreated'));
      router.replace('/?tab=news' as never);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : t('manager.createNewsError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentClassName="flex-grow gap-4 px-5 pb-5 pt-0" withGradient>
      <StatusBar backgroundColor="transparent" style="dark" translucent />

      <View className="flex-row items-center gap-3">
        <PressableScale
          className="h-8 w-8 items-center justify-center"
          haptic="selection"
          onPress={() => router.back()}
        >
          <Ionicons color="#1f2937" name="arrow-back" size={22} />
        </PressableScale>
        <Text className="flex-1 text-[24px] font-extrabold text-foreground">
          {t('manager.createNewsTitle')}
        </Text>
      </View>

      <View className="gap-4">
        <Text className="text-[14px] leading-6 text-muted-foreground">
          {t('manager.createNewsHint')}
        </Text>

        <TextInput
          className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
          onChangeText={setTitle}
          placeholder={t('manager.createNewsTitlePlaceholder')}
          style={{ paddingHorizontal: 18, paddingVertical: 16 }}
          value={title}
        />

        <TextInput
          className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
          multiline
          numberOfLines={8}
          onChangeText={setBody}
          placeholder={t('manager.createNewsBodyPlaceholder')}
          textAlignVertical="top"
          value={body}
        />

        <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-foreground">
                {t('manager.createNewsPhotoTitle')}
              </Text>
              <Text className="mt-2 text-[13px] leading-5 text-muted-foreground">
                {t('manager.createNewsPhotoHint')}
              </Text>
            </View>

            <PressableScale
              className="rounded-full border border-black/10 bg-[#eef3ff] px-4 py-2"
              haptic="selection"
              onPress={openImageSourcePicker}
            >
              <Text className="text-[13px] font-semibold text-[#23324a]">
                {imageDraft
                  ? t('manager.createNewsPhotoChange')
                  : t('manager.createNewsPhotoAdd')}
              </Text>
            </PressableScale>
          </View>

          {imageDraft ? (
            <View className="mt-4 gap-3">
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
                <View className="rounded-full bg-[#eef3ff] px-3 py-2">
                  <Text className="text-[12px] font-semibold tracking-[0.8px] text-[#334155]">
                    {imageDraft.aspectRatio}
                  </Text>
                </View>

                <PressableScale
                  className="rounded-full border border-black/10 px-3 py-2"
                  haptic="selection"
                  onPress={() => openCropper(imageDraft.source, imageDraft.aspectRatio)}
                >
                  <Text className="text-[13px] font-medium text-foreground">
                    {t('manager.createNewsPhotoEdit')}
                  </Text>
                </PressableScale>

                <PressableScale
                  className="rounded-full border border-[#f4b8b8] px-3 py-2"
                  haptic="selection"
                  onPress={() => setImageDraft(null)}
                >
                  <Text className="text-[13px] font-medium text-[#dc2626]">
                    {t('manager.createNewsPhotoRemove')}
                  </Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              className="mt-4 rounded-[22px] border border-dashed border-black/12 bg-[#f8fbff] px-4 py-5"
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
                  <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
                    {t('manager.createNewsPhotoFormats')}
                  </Text>
                </View>
              </View>
            </PressableScale>
          )}
        </View>

        <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
          <NewsOptionCheckbox
            checked={isPinned}
            label={t('manager.createNewsImportant')}
            onPress={() => setIsPinned((current) => !current)}
          />
          <Text className="mt-3 text-[13px] leading-5 text-muted-foreground">
            {t('manager.createNewsAudience')}
          </Text>
        </View>

        <PressableScale
          className={`rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30 ${submitting ? 'opacity-60' : ''}`}
          disabled={submitting}
          haptic="selection"
          onPress={() => void handleSubmit()}
        >
          <Text className="text-center font-display text-[16px] font-semibold text-white">
            {submitting ? t('manager.createNewsCreating') : t('manager.createNewsSubmit')}
          </Text>
        </PressableScale>
      </View>

      <NewsImageCropperModal
        initialAspectRatio={cropAspectRatio}
        onApply={(draft) => setImageDraft(draft)}
        onClose={() => setCropVisible(false)}
        source={cropSource}
        visible={cropVisible}
      />
    </Screen>
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
});
