import type { SupportChatConfig } from "./types";

export type SupportWidgetLocale = "ru" | "en" | "de";

export function normalizeWidgetLocale(raw: string | null | undefined): SupportWidgetLocale {
  const token = String(raw || "").trim().toLowerCase();
  if (token.startsWith("en")) {
    return "en";
  }
  if (token.startsWith("de")) {
    return "de";
  }
  return "ru";
}

export function resolveSupportLocale(config: SupportChatConfig): SupportWidgetLocale {
  try {
    const fromContext = config.getContext?.()?.locale;
    if (fromContext) {
      return normalizeWidgetLocale(fromContext);
    }
  } catch {
    // Host getContext() may throw before the app is ready — fall back below.
  }
  if (config.locale) {
    return normalizeWidgetLocale(config.locale);
  }
  return normalizeWidgetLocale(typeof navigator === "undefined" ? null : navigator.language);
}
