import '../global.css';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen } from 'expo-router';
import { LogBox, View } from 'react-native';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { I18nProvider } from '../lib/i18n';
import { AppGradientBackground } from '../components/ui/app-gradient-background';

void SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    'TeodorTRIAL-Regular': require('../assets/fonts/TeodorTRIAL-Regular.otf'),
    'TeodorTRIAL-RegularItalic': require('../assets/fonts/TeodorTRIAL-RegularItalic.otf'),
  });
  const [bannerReady, setBannerReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const warmUpAssets = async () => {
      try {
        await Asset.loadAsync(require('../bg.webp'));
      } finally {
        if (!cancelled) {
          setBannerReady(true);
        }
      }
    };

    void warmUpAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !bannerReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [bannerReady, fontsLoaded]);

  if (!fontsLoaded || !bannerReady) {
    return null;
  }

  return (
    <I18nProvider>
      <View style={{ flex: 1 }}>
        <AppGradientBackground />
        <Slot />
      </View>
    </I18nProvider>
  );
}
