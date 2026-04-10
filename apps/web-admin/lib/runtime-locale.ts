"use client";

import { readBrowserStorageItem } from "./browser-storage";

export type RuntimeLocale = "ru" | "en";

export function getRuntimeLocale(): RuntimeLocale {
  if (typeof document !== "undefined") {
    const documentLocale = document.documentElement.lang?.toLowerCase() ?? "";
    if (documentLocale.startsWith("ru")) {
      return "ru";
    }
    if (documentLocale.startsWith("en")) {
      return "en";
    }
  }

  if (typeof window !== "undefined") {
    const saved = readBrowserStorageItem("smart-admin-locale");
    if (saved === "ru" || saved === "en") {
      return saved;
    }

    return window.navigator.language.toLowerCase().startsWith("ru")
      ? "ru"
      : "en";
  }

  return "en";
}

export function getRuntimeLocaleTag(locale: RuntimeLocale = getRuntimeLocale()) {
  return locale === "ru" ? "ru-RU" : "en-US";
}

export function runtimeLocalize(
  ru: string,
  en: string,
  locale: RuntimeLocale = getRuntimeLocale(),
) {
  return locale === "ru" ? ru : en;
}
