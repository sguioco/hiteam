import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { useI18n } from '../../lib/i18n';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from './BottomSheetModal';

export type TimeValue = {
  hour: number;
  minute: number;
};

const ITEM_HEIGHT = 56;
const VISIBLE_ROWS = 5;
const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length - 1));
}

function WheelColumn({
  onSelectIndex,
  selectedIndex,
  values,
}: {
  onSelectIndex: (index: number) => void;
  selectedIndex: number;
  values: string[];
}) {
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: selectedIndex * ITEM_HEIGHT,
      });
    });
  }, [selectedIndex]);

  function commitIndex(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = clampIndex(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT), values.length);
    onSelectIndex(nextIndex);
    listRef.current?.scrollToOffset({ animated: true, offset: nextIndex * ITEM_HEIGHT });
  }

  return (
    <View className="relative flex-1 overflow-hidden rounded-[28px] border border-[#d7deea] bg-[#eef2f7]" style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}>
      <View
        className="absolute left-3 right-3 rounded-[22px] bg-[#dde3ec]"
        pointerEvents="none"
        style={{ height: ITEM_HEIGHT, top: WHEEL_PADDING }}
      />
      <FlatList
        className="z-10"
        bounces={false}
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        data={values}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ index, length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index })}
        keyExtractor={(item) => item}
        onMomentumScrollEnd={commitIndex}
        onScrollEndDrag={commitIndex}
        ref={listRef}
        renderItem={({ index, item }) => {
          const isActive = index === selectedIndex;

          return (
            <View className="items-center justify-center" style={{ height: ITEM_HEIGHT }}>
              <Text
                className={isActive ? 'text-[24px] font-extrabold' : 'text-[18px] font-semibold'}
                style={{ color: '#111827' }}
              >
                {item}
              </Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
      />
    </View>
  );
}

export function TimeWheelPicker({
  allowClear = false,
  initialValue,
  onApply,
  onClear,
  onClose,
  title,
  visible,
}: {
  allowClear?: boolean;
  initialValue: TimeValue;
  onApply: (value: TimeValue) => void;
  onClear?: () => void;
  onClose: () => void;
  title: string;
  visible: boolean;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const hourValues = useMemo(() => Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0')), []);
  const minuteValues = useMemo(() => Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0')), []);
  const [hourIndex, setHourIndex] = useState(initialValue.hour);
  const [minuteIndex, setMinuteIndex] = useState(initialValue.minute);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setHourIndex(initialValue.hour);
    setMinuteIndex(initialValue.minute);
  }, [initialValue.hour, initialValue.minute, visible]);

  return (
    <BottomSheetModal
      onClose={onClose}
      sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-5 shadow-2xl shadow-[#1f2687]/15"
      visible={visible}
    >
      <View className="mb-4 flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="font-display text-[24px] font-bold text-foreground">{title}</Text>
          <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">{t('manager.meetingChooseTime')}</Text>
        </View>
        <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-muted/80" haptic="selection" onPress={onClose}>
          <Ionicons color="#111827" name="close" size={18} />
        </PressableScale>
      </View>

      <View className="flex-row gap-4">
        <WheelColumn onSelectIndex={setHourIndex} selectedIndex={hourIndex} values={hourValues} />
        <WheelColumn onSelectIndex={setMinuteIndex} selectedIndex={minuteIndex} values={minuteValues} />
      </View>

      <View className="mt-5 gap-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {allowClear ? (
          <Button
            className="min-h-14 rounded-[24px] border-[#d8e2f0] bg-white"
            label={t('manager.meetingClearEndTime')}
            onPress={onClear}
            variant="secondary"
          />
        ) : null}
        <Button
          className="min-h-14 rounded-[24px] border-transparent bg-[#6d73ff] shadow-lg shadow-[#6d73ff]/25"
          fullWidth
          label={t('manager.meetingApplyTime')}
          onPress={() => onApply({ hour: hourIndex, minute: minuteIndex })}
          textClassName="text-white"
          variant="primary"
        />
      </View>
    </BottomSheetModal>
  );
}
