"use client";

import type { Locale } from "./i18n";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "./browser-storage";

const STORAGE_KEY = "smart-admin-live-translation-cache-v1";
const memoryCache = new Map<string, string>();
let hydrated = false;

function getCacheKey(locale: Locale, text: string) {
  return `${locale}:${text}`;
}

function persistCache() {
  if (typeof window === "undefined") {
    return;
  }

  writeBrowserStorageItem(
    STORAGE_KEY,
    JSON.stringify(Object.fromEntries(memoryCache.entries())),
  );
}

export function hydrateClientTranslationCache() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;

  try {
    const raw = readBrowserStorageItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        memoryCache.set(key, value);
      }
    }
  } catch {
    // Ignore corrupted cache.
  }
}

export function getClientTranslation(locale: Locale, text: string) {
  hydrateClientTranslationCache();
  return memoryCache.get(getCacheKey(locale, text)) ?? null;
}

export function hasClientTranslation(locale: Locale, text: string) {
  hydrateClientTranslationCache();
  return memoryCache.has(getCacheKey(locale, text));
}

export function setClientTranslation(
  locale: Locale,
  text: string,
  translated: string,
) {
  hydrateClientTranslationCache();
  memoryCache.set(getCacheKey(locale, text), translated);
  persistCache();
}
