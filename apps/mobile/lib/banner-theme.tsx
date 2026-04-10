import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export const bannerThemeValues = ['blue'] as const;

export type BannerTheme = (typeof bannerThemeValues)[number];

export type BannerThemeConfig = {
  key: BannerTheme;
  labelKey: string;
  maskColor: string;
  maskOpacity: number;
  fallbackOpacity: number;
  chipBackgroundColor: string;
  chipBorderColor: string;
};

const DEFAULT_BANNER_THEME: BannerTheme = 'blue';
const BANNER_THEME_STORAGE_PATH = `${FileSystem.documentDirectory ?? ''}smart-banner-theme.json`;

export const bannerThemeConfigMap: Record<BannerTheme, BannerThemeConfig> = {
  blue: {
    key: 'blue',
    labelKey: 'profile.bannerThemeBlue',
    maskColor: '#5745f7',
    maskOpacity: 0.4,
    fallbackOpacity: 0.32,
    chipBackgroundColor: '#eff4ff',
    chipBorderColor: '#cad8ff',
  },
};

export const bannerThemeOptions = bannerThemeValues.map(
  (value) => bannerThemeConfigMap[value],
);

type BannerThemeContextValue = {
  theme: BannerTheme;
  setTheme: (theme: BannerTheme) => void;
  config: BannerThemeConfig;
  options: BannerThemeConfig[];
};

const BannerThemeContext = createContext<BannerThemeContextValue | null>(null);

function isBannerTheme(value: string): value is BannerTheme {
  return (bannerThemeValues as readonly string[]).includes(value);
}

export function normalizeBannerTheme(value?: string | null): BannerTheme | null {
  if (!value) {
    return null;
  }

  return isBannerTheme(value) ? value : null;
}

export async function loadBannerThemePreference(): Promise<BannerTheme> {
  if (!FileSystem.documentDirectory) {
    return DEFAULT_BANNER_THEME;
  }

  try {
    const info = await FileSystem.getInfoAsync(BANNER_THEME_STORAGE_PATH);
    if (!info.exists) {
      return DEFAULT_BANNER_THEME;
    }

    const raw = await FileSystem.readAsStringAsync(BANNER_THEME_STORAGE_PATH);
    const parsed = JSON.parse(raw) as { theme?: string };

    return normalizeBannerTheme(parsed.theme) ?? DEFAULT_BANNER_THEME;
  } catch {
    return DEFAULT_BANNER_THEME;
  }
}

async function persistBannerThemePreference(theme: BannerTheme) {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(
    BANNER_THEME_STORAGE_PATH,
    JSON.stringify({ theme }),
  );
}

export function BannerThemeProvider({
  children,
  initialTheme = DEFAULT_BANNER_THEME,
}: PropsWithChildren<{ initialTheme?: BannerTheme }>) {
  const [theme, setThemeState] = useState<BannerTheme>(
    isBannerTheme(initialTheme) ? initialTheme : DEFAULT_BANNER_THEME,
  );

  const setTheme = useCallback((nextTheme: BannerTheme) => {
    setThemeState(nextTheme);
    void persistBannerThemePreference(nextTheme);
  }, []);

  const value = useMemo<BannerThemeContextValue>(
    () => ({
      theme,
      setTheme,
      config: bannerThemeConfigMap[theme],
      options: bannerThemeOptions,
    }),
    [setTheme, theme],
  );

  return (
    <BannerThemeContext.Provider value={value}>
      {children}
    </BannerThemeContext.Provider>
  );
}

export function useBannerTheme() {
  const context = useContext(BannerThemeContext);

  if (!context) {
    throw new Error('useBannerTheme must be used within BannerThemeProvider');
  }

  return context;
}
