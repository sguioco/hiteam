import { useMemo, useRef, useState } from 'react';
import { AnnouncementImageAspectRatio } from '@smart/types';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CropZoom, type CropZoomRefType } from 'react-native-zoom-toolkit';
import BottomSheetModal from './BottomSheetModal';
import { PressableScale } from '../../components/ui/pressable-scale';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';

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
  onClose: () => void;
  onApply: (draft: NewsImageDraft) => void;
};

function getCropCanvas(aspectRatio: number) {
  const windowDimensions = Dimensions.get('window');
  const maxWidth = Math.min(windowDimensions.width - 64, 360);
  const maxHeight = Math.min(248, Math.max(196, Math.floor(windowDimensions.height * 0.26)));

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

function resolveAnnouncementAspectRatio(source: NewsImageSource | null): AnnouncementImageAspectRatio {
  if (!source?.width || !source?.height) {
    return '16:9';
  }

  const ratio = source.width / source.height;

  if (ratio < 1.15) {
    return '1:1';
  }

  if (ratio < 1.56) {
    return '4:3';
  }

  return '16:9';
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
          borderRadius: 26,
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
  onClose,
  onApply,
}: NewsImageCropperModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const cropRef = useRef<CropZoomRefType>(null);
  const [saving, setSaving] = useState(false);
  const selectedAspectRatio = useMemo(
    () => resolveAnnouncementAspectRatio(source),
    [source],
  );

  const copy = useMemo(
    () => ({
      title: t('manager.createNewsPhotoTitle'),
      cancel: t('common.cancel'),
      apply: t('manager.createNewsPhotoUse'),
      saving: t('manager.createNewsPhotoProcessing'),
      error: t('manager.createNewsPhotoPrepareError'),
    }),
    [t],
  );

  const aspectRatioValue = announcementAspectRatioToNumber(selectedAspectRatio);
  const cropSize = useMemo(
    () => getCropCanvas(aspectRatioValue),
    [aspectRatioValue],
  );
  async function handleApply() {
    if (!source || !cropRef.current) {
      return;
    }

    try {
      setSaving(true);
      const cropResult = cropRef.current.crop(1600);
      const actions: Action[] = [];

      // CropZoom scales crop coordinates when fixedWidth is provided,
      // so the image must be resized before applying the crop rectangle.
      if (cropResult.resize) {
        actions.push({ resize: cropResult.resize });
      }

      actions.push({ crop: cropResult.crop });

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
      Alert.alert(t('common.error'), copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={onClose}
      sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-5 shadow-2xl shadow-[#1f2687]/15"
      visible={visible && Boolean(source)}
    >
      <View
        style={{
          paddingBottom: Math.max(insets.bottom, 18),
        }}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="w-10" />
          <View className="flex-1 items-center">
            <Text className="text-center font-display text-[24px] font-bold text-foreground">
              {copy.title}
            </Text>
          </View>

          <PressableScale
            className="h-10 w-10 items-center justify-center"
            haptic="selection"
            onPress={onClose}
          >
            <Ionicons color="#111827" name="close" size={18} />
          </PressableScale>
        </View>

        <View className="items-center justify-center pb-2 pt-1">
          {source ? (
            <View
              style={{
                width: cropSize.width,
                height: cropSize.height,
                borderRadius: 26,
                overflow: 'hidden',
                backgroundColor: '#dbe7ff',
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
                    width: '100%',
                    height: '100%',
                  }}
                />
              </CropZoom>
            </View>
          ) : null}
        </View>

        <View className="mt-4 flex-row w-full items-center gap-3 pb-1">
          <PressableScale
            className="w-full min-h-[56px] items-center justify-center rounded-[24px] border border-[#d8deea] bg-white px-4"
            containerClassName="flex-1"
            contentStyle={{ width: '100%' }}
            disabled={saving}
            haptic="selection"
            onPress={onClose}
          >
            <Text className="text-center font-display text-[16px] font-semibold text-[#11233d]">
              {copy.cancel}
            </Text>
          </PressableScale>

          <PressableScale
            className={`w-full min-h-[56px] items-center justify-center rounded-[24px] bg-primary px-4 ${saving ? 'opacity-70' : ''}`}
            containerClassName="flex-1"
            contentStyle={{ width: '100%' }}
            disabled={saving}
            haptic="selection"
            onPress={() => void handleApply()}
          >
            {saving ? (
              <View className="flex-row items-center justify-center gap-2">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="font-display text-[16px] font-semibold text-white">
                  {copy.saving}
                </Text>
              </View>
            ) : (
              <Text className="text-center font-display text-[16px] font-semibold text-white">
                {copy.apply}
              </Text>
            )}
          </PressableScale>
        </View>
      </View>
    </BottomSheetModal>
  );
}
