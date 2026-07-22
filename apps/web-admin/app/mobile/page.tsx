import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { BrandWordmark } from "@/components/brand-wordmark";
import { AppStoreButton, GooglePlayButton } from "@/components/landing-page";
import {
  GOOGLE_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from "@/lib/mobile-app-links";
const LANDING_LOCALE_COOKIE_NAME = "hiteam-landing-locale";
const ADMIN_LOCALE_COOKIE_NAME = "smart-admin-locale";

type LandingLocale = "en" | "ru" | "es" | "ar";
type MobileSearchParamsValue = {
  locale?: string | string[] | undefined;
};
type MobileSearchParams = Promise<MobileSearchParamsValue>;

const COPY: Record<
  LandingLocale,
  {
    dir: "ltr" | "rtl";
    title: string;
  }
> = {
  en: {
    dir: "ltr",
    title: "Please use mobile app",
  },
  ru: {
    dir: "ltr",
    title: "Пожалуйста, используйте мобильное приложение",
  },
  es: {
    dir: "ltr",
    title: "Por favor, usa la app móvil",
  },
  ar: {
    dir: "rtl",
    title: "يرجى استخدام تطبيق الجوال",
  },
};

export const metadata: Metadata = {
  title: "Please use mobile app | HiTeam",
  description: "Use the HiTeam mobile app on iPhone and Android.",
};

function isLandingLocale(
  value: string | null | undefined,
): value is LandingLocale {
  return value === "en" || value === "ru" || value === "es" || value === "ar";
}

function getSearchLocale(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePreferredLocale(
  acceptLanguage: string | null,
): LandingLocale | null {
  if (!acceptLanguage) {
    return null;
  }

  const tokens = acceptLanguage
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    const locale = token.split(";")[0]?.trim();

    if (!locale) {
      continue;
    }

    if (locale === "ru" || locale.startsWith("ru-")) return "ru";
    if (locale === "es" || locale.startsWith("es-")) return "es";
    if (locale === "ar" || locale.startsWith("ar-")) return "ar";
    if (locale === "en" || locale.startsWith("en-")) return "en";
  }

  return null;
}

async function resolveLocale(
  searchParams?: MobileSearchParams,
): Promise<LandingLocale> {
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const params: MobileSearchParamsValue = searchParams
    ? await searchParams
    : {};
  const queryLocale = getSearchLocale(params.locale);
  const landingLocale = cookieStore.get(LANDING_LOCALE_COOKIE_NAME)?.value;
  const adminLocale = cookieStore.get(ADMIN_LOCALE_COOKIE_NAME)?.value;

  if (isLandingLocale(queryLocale)) return queryLocale;
  if (isLandingLocale(landingLocale)) return landingLocale;
  if (isLandingLocale(adminLocale)) return adminLocale;

  return parsePreferredLocale(requestHeaders.get("accept-language")) ?? "en";
}

export default async function MobileDownloadPage({
  searchParams,
}: {
  searchParams?: MobileSearchParams;
}) {
  const locale = await resolveLocale(searchParams);
  const copy = COPY[locale];

  return (
    <main
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_18%_14%,rgba(125,211,252,0.36),transparent_28%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.34),transparent_32%),linear-gradient(160deg,#082f8f_0%,#1e3a8a_48%,#2563eb_100%)] px-5 py-4 text-white sm:py-6"
      dir={copy.dir}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(255,255,255,0)_38%,rgba(15,23,42,0.18)_100%)]" />
      <section className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[460px] flex-col items-center sm:min-h-[calc(100dvh-3rem)]">
        <header className="flex w-full justify-center">
          <BrandWordmark className="text-[1.85rem] text-white drop-shadow-[0_10px_24px_rgba(15,23,42,0.28)] sm:text-[2.1rem]" />
        </header>

        <div className="mt-[clamp(1.5rem,10dvh,5.5rem)] w-full rounded-[24px] border border-white/22 bg-white/14 px-4 py-5 text-center shadow-[0_28px_90px_rgba(15,23,42,0.30),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl sm:px-7 sm:py-7">
          <h1 className="text-[clamp(1.7rem,9.6vw,3.35rem)] font-semibold leading-[0.98] text-white">
            {copy.title}
          </h1>

          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
            <GooglePlayButton
              aria-label="Google Play"
              className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.24)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
              href={GOOGLE_PLAY_STORE_URL}
              rel="noreferrer"
              size="md"
              target="_blank"
            />
            <AppStoreButton
              aria-label="iOS"
              className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.24)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
              href={IOS_APP_STORE_URL}
              rel="noreferrer"
              size="md"
              target="_blank"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
