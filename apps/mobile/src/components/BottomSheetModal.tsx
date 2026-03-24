import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticMedium, hapticSelection } from '../../lib/haptics';

type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetClassName?: string;
  backdropOpacity?: number;
  solidBackground?: boolean;
};

const HIDDEN_TRANSLATE_Y = 560;

const BottomSheetModal = ({
  backdropOpacity = 0.52,
  children,
  onClose,
  sheetClassName = '',
  solidBackground = false,
  visible,
}: BottomSheetModalProps) => {
  const [mounted, setMounted] = useState(visible);
  const didOpenRef = useRef(false);
  const sheetTranslateY = useSharedValue(HIDDEN_TRANSLATE_Y);
  const backdropValue = useSharedValue(0);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropValue.value * backdropOpacity,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  function finishClose() {
    setMounted(false);
    didOpenRef.current = false;
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    if (!mounted) {
      return;
    }

    backdropValue.value = withTiming(0, { duration: 180 });
    sheetTranslateY.value = withTiming(
      HIDDEN_TRANSLATE_Y,
      { duration: 220 },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [backdropOpacity, backdropValue, mounted, sheetTranslateY, visible]);

  useEffect(() => {
    if (!mounted || !visible) {
      return;
    }

    sheetTranslateY.value = HIDDEN_TRANSLATE_Y;
    backdropValue.value = 0;

    requestAnimationFrame(() => {
      backdropValue.value = withTiming(1, { duration: 180 });
      sheetTranslateY.value = withTiming(0, { duration: 220 });
      if (!didOpenRef.current) {
        didOpenRef.current = true;
        hapticMedium();
      }
    });
  }, [backdropValue, mounted, sheetTranslateY, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <View className="flex-1 justify-end">
        {visible ? (
          <>
            <Animated.View
              className="absolute inset-0 bg-[#0f172a]"
              pointerEvents="none"
              style={backdropStyle}
            />
            <Pressable
              className="absolute inset-0"
              onPress={() => {
                hapticSelection();
                onClose();
              }}
            />
          </>
        ) : null}
        <Animated.View
          className={`overflow-hidden ${sheetClassName}`}
          style={sheetStyle}
        >
          {solidBackground ? (
            <View className="absolute inset-0 bg-white" />
          ) : (
            <>
              <BlurView className="absolute inset-0" intensity={30} tint="light" />
              <View className="absolute inset-0 bg-[#f7faff]/82" />
            </>
          )}
          <View className="absolute inset-x-0 top-3 items-center">
            <View className="h-1.5 w-14 rounded-full bg-[#cfd8ea]" />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheetModal;
