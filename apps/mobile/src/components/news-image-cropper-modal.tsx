import { useEffect, useMemo, useRef, useState } from 'react';
import { AnnouncementImageAspectRatio } from '@smart/types';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CropZoom, type CropZoomRefType, fitContainer } from 'react-native-zoom-toolkit';
import { PressableScale } from '../../components/ui/pressable-scale';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import {
  ANNOUNCEMENT_IMAGE_ASPECT_RATIO_OPTIONS,
  announcementAspectRatioToNumber,
} from '../lib/announcement-images';

export type NewsImageSource = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
};

export type NewsImageDraft = {
  source: NewsImageSource;
  previewUri: string;
  dataUrl: string;
  aspectRatio: AnnouncementImageAspectRatio;
};

type NewsImageCropperModalProps = {
  visible: boolean;
  source: NewsImageSource | null;
  initialAspectRatio: AnnouncementImageAspectRatio;
  onClose: () => void;
  onApply: (draft: NewsImageDraft) => void;
};

function getCropCanvas(aspectRatio: number) {
  const maxWidth = Math.min(Dimensions.get('window').width - 36, 360);
  const maxHeight = 340;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

function CropGridOverlay() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        inset: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          inset: 0,
          borderColor: 'rgba(255,255,255,0.92)',
          borderRadius: 28,
          borderWidth: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '33.3333%',
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '66.6666%',
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '33.3333%',
          width: 1,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '66.6666%',
          width: 1,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
    </View>
  );
}

export function NewsImageCropperModal({
  visible,
  source,
  initialAspectRatio,
  onClose,
  onApply,
}: NewsImageCropperModalProps) {
  const { language } = useI18n();
  const insets = useSafeAreaInsets();
  const cropRef = useRef<CropZoomRefType>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<AnnouncementImageAspectRatio>(initialAspectRatio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedAspectRatio(initialAspectRatio);
  }, [initialAspectRatio, source?.uri, visible]);

  const copy = useMemo(
    () => ({
      title: language === 'ru' ? 'Фото новости' : 'News photo',
      subtitle:
        language === 'ru'
          ? 'Подвиньте фото и приблизьте его так, как оно должно выглядеть в новости.'
          : 'Drag and zoom the image so it looks right in the news card.',
      cancel: language === 'ru' ? 'Отмена' : 'Cancel',
      apply: language === 'ru' ? 'Использовать фото' : 'Use photo',
      saving: language === 'ru' ? 'Сохраняем...' : 'Saving...',
      error:
        language === 'ru'
          ? 'Не удалось подготовить фото новости.'
          : 'Unable to prepare the news image.',
    }),
    [language],
  );

  const aspectRatioValue = announcementAspectRatioToNumber(selectedAspectRatio);
  const cropSize = useMemo(
    () => getCropCanvas(aspectRatioValue),
    [aspectRatioValue],
  );
  const displaySize = useMemo(() => {
    if (!source) {
      return { width: cropSize.width, height: cropSize.height };
    }

    return fitContainer(source.width / source.height, cropSize);
  }, [cropSize, source]);

  async function handleApply() {
    if (!source || !cropRef.current) {
      return;
    }

    try {
      setSaving(true);
      const cropResult = cropRef.current.crop(1600);
      const actions: Action[] = [
        { crop: cropResult.crop },
      ];

      if (cropResult.resize) {
        actions.push({ resize: cropResult.resize });
      }

      const result = await manipulateAsync(
        source.uri,
        actions,
        {
          base64: true,
          compress: 0.9,
          format: SaveFormat.JPEG,
        },
      );

      if (!result.base64) {
        throw new Error(copy.error);
      }

      hapticSuccess();
      onApply({
        source,
        previewUri: result.uri,
        dataUrl: `data:image/jpeg;base64,${result.base64}`,
        aspectRatio: selectedAspectRatio,
      });
      onClose();
    } catch {
      hapticError();
      Alert.alert('Error', copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      transparent={false}
      visible={visible && Boolean(source)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 14,
        }}
      >
        <View className="flex-row items-start justify-between gap-4 px-5">
          <View className="flex-1">
            <Text className="text-[26px] font-extrabold text-white">
              {copy.title}
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-white/72">
              {copy.subtitle}
            </Text>
          </View>

          <PressableScale
            className="h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/8"
            haptic="selection"
            onPress={onClose}
          >
            <Ionicons color="#ffffff" name="close" size={20} />
          </PressableScale>
        </View>

        <View className="mt-5 flex-row flex-wrap gap-2 px-5">
          {ANNOUNCEMENT_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => {
            const active = option.key === selectedAspectRatio;

            return (
              <PressableScale
                className={`rounded-full px-4 py-2.5 ${active ? 'bg-white' : 'border border-white/18 bg-white/8'}`}
                haptic="selection"
                key={option.key}
                onPress={() => setSelectedAspectRatio(option.key)}
              >
                <Text
                  className={`text-[13px] font-semibold ${active ? 'text-[#0f172a]' : 'text-white'}`}
                >
                  {option.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <View className="flex-1 items-center justify-center px-4">
          {source ? (
            <View
              style={{
                width: cropSize.width,
                height: cropSize.height,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: '#020617',
              }}
            >
              <CropZoom
                key={`${source.uri}:${selectedAspectRatio}`}
                ref={cropRef}
                cropSize={cropSize}
                maxScale={8}
                minScale={1}
                OverlayComponent={CropGridOverlay}
                resolution={{
                  height: source.height,
                  width: source.width,
                }}
              >
                <Image
                  resizeMode="cover"
                  source={{ uri: source.uri }}
                  style={{
                    width: displaySize.width,
                    height: displaySize.height,
                  }}
                />
              </CropZoom>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-3 px-5">
          <PressableScale
            className="flex-1 rounded-[24px] border border-white/18 bg-white/8 px-4 py-4"
            disabled={saving}
            haptic="selection"
            onPress={onClose}
          >
            <Text className="text-center text-[15px] font-semibold text-white">
              {copy.cancel}
            </Text>
          </PressableScale>

          <PressableScale
            className={`flex-1 rounded-[24px] border border-transparent bg-white px-4 py-4 ${saving ? 'opacity-70' : ''}`}
            disabled={saving}
            haptic="selection"
            onPress={() => void handleApply()}
          >
            {saving ? (
              <View className="flex-row items-center justify-center gap-2">
                <ActivityIndicator color="#0f172a" size="small" />
                <Text className="text-[15px] font-semibold text-[#0f172a]">
                  {copy.saving}
                </Text>
              </View>
            ) : (
              <Text className="text-center text-[15px] font-semibold text-[#0f172a]">
                {copy.apply}
              </Text>
            )}
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}
