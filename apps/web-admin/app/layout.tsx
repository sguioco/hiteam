import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import localFont from 'next/font/local';
import { Montserrat, Onest } from 'next/font/google';
import '@aws-amplify/ui-react-liveness/styles.css';
import '../../../example-unframer-app/src/framer/styles.css';
import './globals.css';
import { Providers } from './providers';
import { petersburgHero } from './landing-hero-font';
import { cn } from "@/lib/utils";
import { getServerSession } from "@/lib/server-auth";
import { loadInitialShellBootstrap } from "@/lib/server-shell";

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
  variable: '--font-brand',
});

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-landing',
});

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-hero-display',
  weight: ['500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Smart',
  description: 'Operational control center for attendance, scheduling, and workforce workflows.',
};

function resolveInitialLocale(
  acceptLanguageHeader: string | null,
  localeCookie: string | undefined,
): "en" | "ru" {
  if (localeCookie === "ru" || localeCookie === "en") {
    return localeCookie;
  }

  return acceptLanguageHeader?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const isPublicRoute = requestHeaders.get("x-smart-public-route") === "1";
  const initialLocale = resolveInitialLocale(
    requestHeaders.get("accept-language"),
    cookieStore.get("smart-admin-locale")?.value,
  );
  const initialSession = await getServerSession();
  const initialShellBootstrap = initialSession
    ? isPublicRoute
      ? null
      : await loadInitialShellBootstrap(initialSession)
    : null;
  const sessionBootstrapScript = `window.__SMART_INITIAL_SESSION__ = ${JSON.stringify(initialSession).replace(/</g, "\\u003c")}; window.__SMART_INITIAL_SHELL__ = ${JSON.stringify(initialShellBootstrap).replace(/</g, "\\u003c")};`;

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
      <body>
        <script dangerouslySetInnerHTML={{ __html: sessionBootstrapScript }} />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
