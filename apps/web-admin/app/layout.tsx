import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import localFont from 'next/font/local';
import { Montserrat, Onest } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { petersburgHero } from './landing-hero-font';
import { cn } from "@/lib/utils";
import { getServerSessionSnapshot } from "@/lib/server-auth";
import {
  LANDING_HERO_POSTER_SRC,
} from "@/lib/landing-assets";

const teodor = localFont({
  src: [
    {
      path: '../public/fonts/TeodorTRIAL-Regular.otf',
      style: 'normal',
      weight: '400',
    },
    {
      path: '../public/fonts/TeodorTRIAL-RegularItalic.otf',
      style: 'italic',
      weight: '400',
    },
  ],
  display: 'swap',
  variable: '--font-brand',
});

const montserrat = Montserrat({
  display: 'swap',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-landing',
});

const onest = Onest({
  display: 'swap',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-hero-display',
  weight: ['500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'HiTeam — Workforce Management & Attendance Control',
  description: 'Workforce management, attendance control, scheduling, tasks, checklists and mobile verification for real-world teams.',
  icons: {
    icon: '/waving.png',
    shortcut: '/waving.png',
    apple: '/waving.png',
  },
  openGraph: {
    title: 'HiTeam — Workforce Management & Attendance Control',
    description: 'Control attendance, shifts, tasks and field teams from one mobile-first platform.',
    images: [LANDING_HERO_POSTER_SRC],
  },
};

function parsePreferredLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): "en" | "ru" | null {
  if (!acceptLanguageHeader) {
    return null;
  }

  const tokens = acceptLanguageHeader
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    const locale = token.split(";")[0]?.trim();
    if (!locale) {
      continue;
    }

    if (locale === "ru" || locale.startsWith("ru-")) {
      return "ru";
    }

    if (locale === "en" || locale.startsWith("en-")) {
      return "en";
    }
  }

  return null;
}

function resolveInitialLocale(
  acceptLanguageHeader: string | null,
  localeCookie: string | undefined,
  isPublicRoute: boolean,
): "en" | "ru" {
  const browserLocale = parsePreferredLocaleFromAcceptLanguage(acceptLanguageHeader);

  if (isPublicRoute) {
    if (browserLocale) {
      return browserLocale;
    }

    if (localeCookie === "ru" || localeCookie === "en") {
      return localeCookie;
    }

    return "en";
  }

  if (localeCookie === "ru" || localeCookie === "en") {
    return localeCookie;
  }

  return browserLocale ?? "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const isPublicRoute = requestHeaders.get("x-smart-public-route") === "1";
  const initialLocale = resolveInitialLocale(
    requestHeaders.get("accept-language"),
    cookieStore.get("smart-admin-locale")?.value,
    isPublicRoute,
  );
  const initialSession = isPublicRoute ? null : await getServerSessionSnapshot();
  const sessionBootstrapScript = `window.__SMART_INITIAL_SESSION__ = ${JSON.stringify(initialSession).replace(/</g, "\\u003c")}; window.__SMART_INITIAL_SHELL__ = null;`;

  return (
    <html
      lang={initialLocale}
      className={cn(
        teodor.variable,
        montserrat.variable,
        onest.variable,
        petersburgHero.variable,
      )}
    >
      <head>
        <link as="image" fetchPriority="high" href={LANDING_HERO_POSTER_SRC} rel="preload" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: sessionBootstrapScript }} />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
