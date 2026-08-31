import '../global.css';
import { useEffect, useMemo, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import * as Updates from 'expo-updates';
import { ActivityIndicator, LogBox, Platform, Pressable, Text, View } from 'react-native';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { bootstrapPushNotifications, restorePersistedSession, setUnauthorizedHandler } from '../lib/api';
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
import {
  hydrateWorkspaceCaches,
  warmWorkspaceCaches,
} from '../lib/workspace-cache';
import {
  getWorkspaceSetupHref,
  isWorkspaceSetupRoute,
  matchesWorkspaceSetupStep,
  resolveWorkspaceSetupStep,
} from '../lib/workspace-setup';

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 28 }}>
      <Text style={{ color: '#25324c', fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
        Не удалось открыть экран
      </Text>
      <Text style={{ marginTop: 10, color: '#7f879d', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
        Something went wrong. Try opening this screen again.
      </Text>
      {__DEV__ ? (
        <Text selectable style={{ marginTop: 14, color: '#b42318', fontSize: 12, textAlign: 'center' }}>
          {error.message}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{ marginTop: 22, minWidth: 180, alignItems: 'center', borderRadius: 18, backgroundColor: '#3155ff', paddingHorizontal: 24, paddingVertical: 14 }}
      >
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Попробовать снова</Text>
      </Pressable>
    </View>
  );
}

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
      style={{ flex: 1, backgroundColor: '#ffffff', direction }}
    >
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
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
  const [startupDeadlineReached, setStartupDeadlineReached] = useState(false);

  const startupReady = useMemo(
    () =>
      startupDeadlineReached ||
      ((fontsLoaded || Boolean(fontError)) &&
        bannerReady &&
        authReady &&
        bannerThemeReady &&
        languageReady),
    [authReady, bannerReady, bannerThemeReady, fontError, fontsLoaded, languageReady, startupDeadlineReached],
  );

  useEffect(() => {
    const loadingScreenTimer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 700);
    const startupDeadlineTimer = setTimeout(() => {
      setStartupDeadlineReached(true);
    }, 8_000);

    return () => {
      clearTimeout(loadingScreenTimer);
      clearTimeout(startupDeadlineTimer);
    };
  }, []);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let cancelled = false;

    const applyAvailableUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (cancelled || !update.isAvailable) {
          return;
        }

        await Updates.fetchUpdateAsync();
        if (!cancelled) {
          await Updates.reloadAsync();
        }
      } catch {
        // The embedded bundle remains usable if the update service is unreachable.
      }
    };

    void applyAvailableUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const warmUpAssets = async () => {
      try {
        await Asset.loadAsync([
          require('../hero.mp4'),
          require('../hero_android.webm'),
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
      try {
        const language = await loadPersistedLanguagePreference();
        const layout = await applyLanguageLayoutDirection(language, {
          reloadOnChange: true,
        });

        if (layout.didChange || cancelled) {
          return;
        }

        setInitialLanguage(language);
      } catch {
        if (!cancelled) {
          setInitialLanguage('en');
        }
      } finally {
        if (!cancelled) {
          setLanguageReady(true);
        }
      }
    };

    void hydrateLanguage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialLanguage) {
      return;
    }

    let cancelled = false;

    const hydrateAuth = async () => {
      try {
        const session = await restorePersistedSession();
        const [workspaceSetupStep] = await Promise.all([
          session?.user.workspaceAccessAllowed
            ? resolveWorkspaceSetupStep()
            : Promise.resolve(null),
          session?.user.workspaceAccessAllowed
            ? hydrateWorkspaceCaches(
                session.user.roleCodes,
                initialLanguage,
              )
            : Promise.resolve(),
        ]);
        if (cancelled) {
          return;
        }

        updateAuthFlowState({
          isAuthenticated: Boolean(session),
          roleCodes: session?.user.roleCodes ?? [],
          workspaceAccessAllowed: session?.user.workspaceAccessAllowed ?? false,
          workspaceSetupStep,
        });

        if (session?.user.workspaceAccessAllowed && !workspaceSetupStep) {
          void bootstrapPushNotifications();
          void warmWorkspaceCaches(session.user.roleCodes, {
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
    if (!startupReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [startupReady]);

  if (!startupReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Text style={{ color: '#25324c', fontFamily: 'serif', fontSize: 42 }}>HiTeam</Text>
        <ActivityIndicator color="#3155ff" size="small" style={{ marginTop: 22 }} />
      </View>
    );
  }

  const resolvedInitialLanguage = initialLanguage ?? 'en';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BannerThemeProvider initialTheme={bannerTheme}>
        <I18nProvider initialLanguage={resolvedInitialLanguage}>
          <HeroUINativeProvider config={{ toast: false, devInfo: { stylingPrinciples: false } }}>
            <AppRouterSlot />
          </HeroUINativeProvider>
        </I18nProvider>
      </BannerThemeProvider>
    </GestureHandlerRootView>
  );
}
