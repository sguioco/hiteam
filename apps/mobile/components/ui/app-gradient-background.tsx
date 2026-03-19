import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type BlobProps = {
  color: string;
  duration: number;
  opacity: number;
  originX: number;
  originY: number;
  rangeX: number;
  rangeY: number;
  size: number;
};

function AnimatedBlob({
  color,
  duration,
  opacity,
  originX,
  originY,
  rangeX,
  rangeY,
  size,
}: BlobProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);

    translateX.value = withRepeat(withTiming(rangeX, { duration, easing }), -1, true);
    translateY.value = withRepeat(withTiming(rangeY, { duration: Math.round(duration * 0.85), easing }), -1, true);
    scale.value = withRepeat(withTiming(1.16, { duration: Math.round(duration * 0.7), easing }), -1, true);
  }, [duration, rangeX, rangeY, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          backgroundColor: color,
          height: size,
          left: originX,
          opacity,
          top: originY,
          width: size,
        },
        animatedStyle,
      ]}
    />
  );
}

export function AppGradientBackground() {
  const { height, width } = useWindowDimensions();
  const primarySize = Math.max(width, height) * 0.78;
  const secondarySize = Math.max(width, height) * 0.92;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#fdfefe', '#eef6ff', '#dffbff']}
        end={{ x: 0.2, y: 0 }}
        start={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <AnimatedBlob
        color="#7dd3fc"
        duration={22000}
        opacity={0.22}
        originX={-primarySize * 0.2}
        originY={-primarySize * 0.12}
        rangeX={width * 0.18}
        rangeY={height * 0.12}
        size={primarySize}
      />
      <AnimatedBlob
        color="#818cf8"
        duration={18000}
        opacity={0.16}
        originX={width * 0.48}
        originY={height * 0.02}
        rangeX={-width * 0.14}
        rangeY={height * 0.16}
        size={secondarySize}
      />
      <AnimatedBlob
        color="#22d3ee"
        duration={26000}
        opacity={0.15}
        originX={width * 0.1}
        originY={height * 0.58}
        rangeX={width * 0.12}
        rangeY={-height * 0.14}
        size={primarySize * 0.92}
      />
      <AnimatedBlob
        color="#c084fc"
        duration={20000}
        opacity={0.1}
        originX={width * 0.62}
        originY={height * 0.62}
        rangeX={-width * 0.1}
        rangeY={-height * 0.1}
        size={primarySize * 0.72}
      />

      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    borderRadius: 9999,
    position: 'absolute',
  },
});
