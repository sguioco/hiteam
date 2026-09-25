import { writeBrowserStorageItem } from "./browser-storage";

export type SupportedLocale = "en" | "ru";

export const LOCALE_STORAGE_KEY = "smart-admin-locale";

function parsePreferredLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): SupportedLocale | null {
  if (!acceptLanguageHeader) return null;

  for (const token of acceptLanguageHeader.split(",")) {
    const locale = token.trim().toLowerCase().split(";")[0]?.trim();
    if (locale === "ru" || locale?.startsWith("ru-")) return "ru";
    if (locale === "en" || locale?.startsWith("en-")) return "en";
  }

  return null;
}

export function resolveInitialLocale(
  acceptLanguageHeader: string | null,
  localeCookie: string | undefined,
  isPublicRoute: boolean,
  sessionPreferredLocale?: string | null,
): SupportedLocale {
  if (localeCookie === "ru" || localeCookie === "en") return localeCookie;
  if (!isPublicRoute && (sessionPreferredLocale === "ru" || sessionPreferredLocale === "en")) {
    return sessionPreferredLocale;
  }

  return parsePreferredLocaleFromAcceptLanguage(acceptLanguageHeader) ?? "en";
}

export function persistBrowserLocalePreference(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;

  writeBrowserStorageItem(LOCALE_STORAGE_KEY, locale);
  writeBrowserStorageItem("hiteam-landing-locale", locale);
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `hiteam-landing-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}
