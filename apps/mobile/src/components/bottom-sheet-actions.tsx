import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_SHEET_ACTION_BUTTON_CLASS =
  'min-h-[58px] items-center justify-center rounded-[24px] px-4';
export const BOTTOM_SHEET_ACTION_ROW_CLASS = 'flex-row items-center gap-3';
export const BOTTOM_SHEET_ACTION_TEXT_CLASS =
  'text-center font-display text-[16px] font-semibold';

const ACTION_BUTTON_HEIGHT = 58;
const ACTION_BOTTOM_EXTRA = -6;
const ACTION_BOTTOM_FALLBACK = 24;
const ACTION_CONTENT_GAP = 12;

export function getBottomSheetActionBottomOffset(insetBottom: number) {
  return Math.max(insetBottom + ACTION_BOTTOM_EXTRA, ACTION_BOTTOM_FALLBACK);
}

export function getBottomSheetActionReservedSpace(insetBottom: number) {
  return (
    getBottomSheetActionBottomOffset(insetBottom) +
    ACTION_BUTTON_HEIGHT +
    ACTION_CONTENT_GAP
  );
}

type BottomSheetActionDockProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function BottomSheetActionDock({
  children,
  className = '',
  style,
}: BottomSheetActionDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`absolute inset-x-0 ${className}`}
      style={[{ bottom: getBottomSheetActionBottomOffset(insets.bottom) }, style]}
    >
      {children}
    </View>
  );
}
