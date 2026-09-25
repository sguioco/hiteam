import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text } from '../../components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getDateLocale, useI18n } from '../../lib/i18n';
import { clockPeriod, displayHour, parseTimeInput, usesTwelveHourClock, type ClockPeriod } from '../../lib/time-input';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from './BottomSheetModal';
import {
  BOTTOM_SHEET_ACTION_BUTTON_CLASS,
  getBottomSheetActionBottomOffset,
} from './bottom-sheet-actions';

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
        nestedScrollEnabled
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

type TimeWheelPickerPanelProps = {
  active?: boolean;
  allowClear?: boolean;
  bottomPadding?: number;
  initialValue: TimeValue;
  onApply: (value: TimeValue) => void;
  onClear?: () => void;
  onClose: () => void;
  title: string;
  timeMode?: 'clock' | 'duration';
};

export function TimeWheelPickerPanel({
  allowClear = false,
  active = true,
  bottomPadding = 12,
  initialValue,
  onApply,
  onClear,
  onClose,
  title,
  timeMode = 'clock',
}: TimeWheelPickerPanelProps) {
  const { language, t } = useI18n();
  const twelveHour = timeMode === 'clock' && usesTwelveHourClock(getDateLocale(language));
  const hourValues = useMemo(() => Array.from({ length: twelveHour ? 12 : 24 }, (_, index) => `${index + (twelveHour ? 1 : 0)}`.padStart(2, '0')), [twelveHour]);
  const minuteValues = useMemo(() => Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0')), []);
  const [hourIndex, setHourIndex] = useState(initialValue.hour);
  const [minuteIndex, setMinuteIndex] = useState(initialValue.minute);
  const [hourInput, setHourInput] = useState(String(displayHour(initialValue.hour, twelveHour)).padStart(2, '0'));
  const [minuteInput, setMinuteInput] = useState(String(initialValue.minute).padStart(2, '0'));
  const [period, setPeriod] = useState<ClockPeriod>(clockPeriod(initialValue.hour));
  const [manualFocused, setManualFocused] = useState(false);
  const parsedInput = parseTimeInput(hourInput, minuteInput, twelveHour, period);

  useEffect(() => {
    if (!active) {
      return;
    }

    setHourIndex(initialValue.hour);
    setMinuteIndex(initialValue.minute);
    setHourInput(String(displayHour(initialValue.hour, twelveHour)).padStart(2, '0'));
    setMinuteInput(String(initialValue.minute).padStart(2, '0'));
    setPeriod(clockPeriod(initialValue.hour));
    setManualFocused(false);
  }, [active, initialValue.hour, initialValue.minute, twelveHour]);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => setManualFocused(false));
    return () => subscription.remove();
  }, []);

  function selectHour(index: number) {
    const hour = twelveHour ? ((index + 1) % 12) + (period === 'PM' ? 12 : 0) : index;
    setHourIndex(hour);
    setHourInput(String(displayHour(hour, twelveHour)).padStart(2, '0'));
  }

  function selectMinute(index: number) {
    setMinuteIndex(index);
    setMinuteInput(String(index).padStart(2, '0'));
  }

  function changeHour(value: string) {
    setHourInput(value);
    const parsed = parseTimeInput(value, minuteInput, twelveHour, period);
    if (parsed) setHourIndex(parsed.hour);
  }

  function changeMinute(value: string) {
    setMinuteInput(value);
    const parsed = parseTimeInput(hourInput, value, twelveHour, period);
    if (parsed) setMinuteIndex(parsed.minute);
  }

  function changePeriod(nextPeriod: ClockPeriod) {
    setPeriod(nextPeriod);
    const parsed = parseTimeInput(hourInput, minuteInput, twelveHour, nextPeriod);
    if (parsed) setHourIndex(parsed.hour);
  }

  return (
    <>
      <View className="mb-4 flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="font-display text-[24px] font-bold text-foreground">{title}</Text>
          <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">{t('manager.meetingChooseTime')}</Text>
        </View>
        <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff]/80" haptic="selection" onPress={onClose}>
          <Ionicons color="#111827" name="close" size={18} />
        </PressableScale>
      </View>

      {!manualFocused ? (
        <View className="flex-row gap-4">
          <WheelColumn onSelectIndex={selectHour} selectedIndex={twelveHour ? displayHour(hourIndex, true) - 1 : hourIndex} values={hourValues} />
          <WheelColumn onSelectIndex={selectMinute} selectedIndex={minuteIndex} values={minuteValues} />
        </View>
      ) : null}

      <View className="mt-4 gap-2">
        <Text className="font-body text-sm text-muted-foreground">
          {t(twelveHour ? 'timePicker.manualHint12' : 'timePicker.manualHint24')}
        </Text>
        <View className="flex-row items-center gap-2">
          <Input accessibilityLabel={t('timePicker.hour')} className="w-20 text-center" invalid={!parsedInput} keyboardType="number-pad" maxLength={2} onChangeText={changeHour} onFocus={() => setManualFocused(true)} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" selectTextOnFocus value={hourInput} />
          <Text className="font-body text-xl font-semibold text-foreground">:</Text>
          <Input accessibilityLabel={t('timePicker.minute')} className="w-20 text-center" invalid={!parsedInput} keyboardType="number-pad" maxLength={2} onChangeText={changeMinute} onFocus={() => setManualFocused(true)} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" selectTextOnFocus value={minuteInput} />
          {twelveHour ? (['AM', 'PM'] as const).map((value) => (
            <PressableScale
              accessibilityLabel={value}
              className={`min-h-12 min-w-12 items-center justify-center rounded-xl border ${period === value ? 'border-[#6d73ff] bg-[#e9ebff]' : 'border-[#d7deea] bg-white'}`}
              key={value}
              onPress={() => changePeriod(value)}
            >
              <Text className="font-body text-sm font-semibold text-foreground">{value}</Text>
            </PressableScale>
          )) : null}
        </View>
        {!parsedInput ? <Text className="font-body text-sm text-danger">{t('timePicker.invalidTime')}</Text> : null}
      </View>

      <View className="mt-5 gap-3" style={{ paddingBottom: bottomPadding }}>
        {allowClear ? (
          <Button
            className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-[#d8e2f0] bg-white`}
            label={t('manager.meetingClearEndTime')}
            onPress={onClear}
            variant="secondary"
          />
        ) : null}
        <Button
          className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} border-transparent bg-[#6d73ff] shadow-lg shadow-[#6d73ff]/25`}
          disabled={!parsedInput}
          fullWidth
          label={t('manager.meetingApplyTime')}
          onPress={() => { if (parsedInput) onApply(parsedInput); }}
          textClassName="text-white"
          variant="primary"
        />
      </View>
    </>
  );
}

export function TimeWheelPicker({
  allowClear = false,
  initialValue,
  onApply,
  onClear,
  onClose,
  title,
  timeMode = 'clock',
  visible,
}: TimeWheelPickerPanelProps & {
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      onClose={onClose}
      sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-5 shadow-2xl shadow-[#1f2687]/15"
      visible={visible}
    >
      <TimeWheelPickerPanel
        active={visible}
        allowClear={allowClear}
        bottomPadding={getBottomSheetActionBottomOffset(insets.bottom)}
        initialValue={initialValue}
        onApply={onApply}
        onClear={onClear}
        onClose={onClose}
        title={title}
        timeMode={timeMode}
      />
    </BottomSheetModal>
  );
}
