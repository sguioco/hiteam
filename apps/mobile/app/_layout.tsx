import '../global.css';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, usePathname, useRouter } from 'expo-router';
import { LogBox, Platform, View } from 'react-native';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { restorePersistedSession, setUnauthorizedHandler } from '../lib/api';
import { updateAuthFlowState, useAuthFlowState } from '../lib/auth-flow';
import { BannerThemeProvider, loadBannerThemePreference, type BannerTheme } from '../lib/banner-theme';
import {
  applyLanguageLayoutDirection,
  I18nProvider,
  isRTLLanguage,
  loadPersistedLanguagePreference,
  useI18n,
  type AppLanguage,
} from '../lib/i18n';
import { warmWorkspaceCachesWithinBudget } from '../lib/workspace-cache';
import {
  getWorkspaceSetupHref,
  isWorkspaceSetupRoute,
  matchesWorkspaceSetupStep,
  resolveWorkspaceSetupStep,
} from '../lib/workspace-setup';

void SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

function AppRouterSlot() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, workspaceAccessAllowed, workspaceSetupStep } = useAuthFlowState();
  const { language } = useI18n();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      updateAuthFlowState({
        isAuthenticated: false,
        roleCodes: [],
        workspaceAccessAllowed: false,
        workspaceSetupStep: null,
      });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const isPublicRoute = pathname === '/' || pathname.startsWith('/auth');
    const isSetupRoute = isWorkspaceSetupRoute(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/');
      return;
    }

    if (
      isAuthenticated &&
      workspaceAccessAllowed &&
      workspaceSetupStep &&
      !matchesWorkspaceSetupStep(pathname, workspaceSetupStep)
    ) {
      router.replace(getWorkspaceSetupHref(workspaceSetupStep) as never);
      return;
    }

    if (isAuthenticated && workspaceAccessAllowed && !workspaceSetupStep && isSetupRoute) {
      router.replace('/today' as never);
    }
  }, [isAuthenticated, pathname, router, workspaceAccessAllowed, workspaceSetupStep]);

  const direction = isRTLLanguage(language) ? 'rtl' : 'ltr';

  return (
    <View
      {...(Platform.OS === 'web' ? { dir: direction } : {})}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
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
  const [initialLanguage, setInitialLanguage] = useState<AppLanguage | null>(null);
  const [languageReady, setLanguageReady] = useState(false);

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

    const hydrateLanguage = async () => {
      const language = await loadPersistedLanguagePreference();
      const layout = await applyLanguageLayoutDirection(language, {
        reloadOnChange: true,
      });

      if (layout.didChange || cancelled) {
        return;
      }

      setInitialLanguage(language);
      setLanguageReady(true);
    };

    void hydrateLanguage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuth = async () => {
      try {
        const session = await restorePersistedSession();
        const workspaceSetupStep =
          session?.user.workspaceAccessAllowed
            ? await resolveWorkspaceSetupStep()
            : null;
        if (cancelled) {
          return;
        }

        updateAuthFlowState({
          isAuthenticated: Boolean(session),
          roleCodes: session?.user.roleCodes ?? [],
          workspaceAccessAllowed: session?.user.workspaceAccessAllowed ?? false,
          workspaceSetupStep,
        });

        if (session?.user.workspaceAccessAllowed && !workspaceSetupStep && initialLanguage) {
          await warmWorkspaceCachesWithinBudget(session.user.roleCodes, 240, {
            language: initialLanguage,
          });
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
  }, [initialLanguage]);

  useEffect(() => {
    if (!fontsLoaded || !bannerReady || !authReady || !bannerThemeReady || !languageReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [authReady, bannerReady, bannerThemeReady, fontsLoaded, languageReady]);

  if (!fontsLoaded || !bannerReady || !authReady || !bannerThemeReady || !languageReady || !initialLanguage) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BannerThemeProvider initialTheme={bannerTheme}>
        <I18nProvider initialLanguage={initialLanguage}>
          <HeroUINativeProvider config={{ toast: false, devInfo: { stylingPrinciples: false } }}>
            <AppRouterSlot />
          </HeroUINativeProvider>
        </I18nProvider>
      </BannerThemeProvider>
    </GestureHandlerRootView>
  );
}
