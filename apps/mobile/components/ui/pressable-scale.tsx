import { type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { cn } from '../../lib/cn';
import {
  hapticError,
  hapticMedium,
  hapticPress,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
} from '../../lib/haptics';

type HapticKind = 'none' | 'press' | 'selection' | 'medium' | 'success' | 'warning' | 'error';

type PressableScaleProps = Omit<PressableProps, 'children'> & {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind;
  scaleTo?: number;
};

function fireHaptic(kind: HapticKind) {
  switch (kind) {
    case 'selection':
      hapticSelection();
      break;
    case 'medium':
      hapticMedium();
      break;
    case 'success':
      hapticSuccess();
      break;
    case 'warning':
      hapticWarning();
      break;
    case 'error':
      hapticError();
      break;
    case 'none':
      break;
    default:
      hapticPress();
      break;
  }
}

export function PressableScale({
  children,
  className,
  containerClassName,
  contentStyle,
  disabled,
  haptic = 'press',
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = 0.985,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      className={containerClassName}
      disabled={disabled}
      onPress={(event) => {
        if (!disabled) {
          fireHaptic(haptic);
        }
        onPress?.(event);
      }}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, { damping: 22, stiffness: 360 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 22, stiffness: 320 });
        onPressOut?.(event);
      }}
      style={style}
      {...props}
    >
      <Animated.View style={[animatedStyle, contentStyle]}>
        <View className={cn(className, disabled && 'opacity-60')}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
