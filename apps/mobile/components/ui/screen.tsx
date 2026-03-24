import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../lib/cn';

type ScreenProps = ScrollViewProps & {
  safeAreaClassName?: string;
  contentClassName?: string;
  withGradient?: boolean;
};

export function AppGradientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#46d8ee', '#67e1f1', '#a7eef8', '#eefbfe', '#ffffff']}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.34, 0.62, 0.84, 1]}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={styles.topGlow}
      />
    </View>
  );
}

export function Screen({ children, contentClassName, safeAreaClassName, withGradient = false, ...props }: ScreenProps) {
  return (
    <SafeAreaView className={cn('flex-1', withGradient ? 'bg-[#41e4f6]' : 'bg-canvas', safeAreaClassName)}>
      {withGradient ? <AppGradientBackground /> : null}
      <ScrollView className="flex-1 bg-transparent" contentContainerClassName={cn('gap-5 p-5', contentClassName)} {...props}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    ...StyleSheet.absoluteFillObject,
    height: '42%',
  },
});
