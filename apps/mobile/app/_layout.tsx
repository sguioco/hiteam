import '../global.css';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, usePathname, useRouter } from 'expo-router';
import { LogBox, View } from 'react-native';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { restorePersistedSession, setUnauthorizedHandler } from '../lib/api';
import { updateAuthFlowState, useAuthFlowState } from '../lib/auth-flow';
import { BannerThemeProvider, loadBannerThemePreference, type BannerTheme } from '../lib/banner-theme';
import { I18nProvider } from '../lib/i18n';
import { warmWorkspaceCachesWithinBudget } from '../lib/workspace-cache';

void SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

function AppRouterSlot() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthFlowState();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      updateAuthFlowState({ isAuthenticated: false, roleCodes: [], workspaceAccessAllowed: false });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const isPublicRoute = pathname === '/' || pathname.startsWith('/auth');

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, pathname, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <Slot />
    </View>
  );
}

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
  const [authReady, setAuthReady] = useState(false);
  const [bannerTheme, setBannerTheme] = useState<BannerTheme>('blue');
  const [bannerThemeReady, setBannerThemeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const warmUpAssets = async () => {
      try {
        await Asset.loadAsync([
          require('../hero.mp4'),
          require('../hero.webm'),
          require('../timelapse-mobile.mp4'),
          require('../timelapse-poster.jpg'),
        ]);
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
    let cancelled = false;

    const hydrateBannerTheme = async () => {
      try {
        const savedTheme = await loadBannerThemePreference();
        if (!cancelled) {
          setBannerTheme(savedTheme);
        }
      } finally {
        if (!cancelled) {
          setBannerThemeReady(true);
        }
      }
    };

    void hydrateBannerTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuth = async () => {
      try {
        const session = await restorePersistedSession();
        if (cancelled) {
          return;
        }

        updateAuthFlowState({
          isAuthenticated: Boolean(session),
          roleCodes: session?.user.roleCodes ?? [],
          workspaceAccessAllowed: session?.user.workspaceAccessAllowed ?? false,
        });

        if (session?.user.workspaceAccessAllowed) {
          await warmWorkspaceCachesWithinBudget(session.user.roleCodes, 240);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void hydrateAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !bannerReady || !authReady || !bannerThemeReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [authReady, bannerReady, bannerThemeReady, fontsLoaded]);

  if (!fontsLoaded || !bannerReady || !authReady || !bannerThemeReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BannerThemeProvider initialTheme={bannerTheme}>
        <I18nProvider>
          <HeroUINativeProvider config={{ toast: false, devInfo: { stylingPrinciples: false } }}>
            <AppRouterSlot />
          </HeroUINativeProvider>
        </I18nProvider>
      </BannerThemeProvider>
    </GestureHandlerRootView>
  );
}
