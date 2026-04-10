import { Platform, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TopChromeBlurProps = {
  extraHeight?: number;
};

export function TopChromeBlur({ extraHeight = 18 }: TopChromeBlurProps) {
  const insets = useSafeAreaInsets();
  const chromeHeight = insets.top + Math.max(10, extraHeight - 6);

  const chromeContent = (
    <View
      style={[
        styles.chromeContent,
        {
          height: chromeHeight,
        },
      ]}
    >
      <BlurView
        blurReductionFactor={Platform.OS === 'android' ? 8 : 4}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
        intensity={Platform.OS === 'android' ? 72 : 24}
        style={StyleSheet.absoluteFill}
        tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : 'default'}
      />
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.08)',
          'rgba(255,255,255,0.03)',
          'rgba(255,255,255,0.01)',
          'rgba(255,255,255,0)',
        ]}
        locations={[0, 0.36, 0.74, 1]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );

  const mask = (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.96)',
          'rgba(0,0,0,0.88)',
          'rgba(0,0,0,0.44)',
          'rgba(0,0,0,0.12)',
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.34, 0.64, 0.86, 1]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          {
            height: chromeHeight,
          },
        ]}
      >
        {chromeContent}
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: chromeHeight,
        },
      ]}
    >
      <MaskedView maskElement={mask} style={StyleSheet.absoluteFill}>
        {chromeContent}
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  chromeContent: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
});
