"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "./i18n";
import {
  getClientTranslation,
  hasClientTranslation,
  hydrateClientTranslationCache,
  setClientTranslation,
} from "./client-translation-cache";
import { getLocalTextTranslation } from "./local-text-translation";

const clientCache = new Map<string, string>();
const pendingCache = new Map<string, Promise<Record<string, string>>>();
const TEXT_LIST_SEPARATOR = "\u0000";

function normalizeTranslationText(text: string) {
  return text.trim();
}

function normalizeTextList(texts: string[]) {
  return Array.from(
    new Set(texts.map(normalizeTranslationText).filter(Boolean)),
  );
}

function getCacheKey(locale: Locale, text: string) {
  return `${locale}:${normalizeTranslationText(text)}`;
}

function primeLocalTranslations(texts: string[], locale: Locale) {
  hydrateClientTranslationCache();

  for (const text of texts) {
    const normalizedText = normalizeTranslationText(text);
    const persistedTranslation = getClientTranslation(locale, normalizedText);
    if (persistedTranslation) {
      clientCache.set(getCacheKey(locale, normalizedText), persistedTranslation);
      continue;
    }

    const translated = getLocalTextTranslation(normalizedText, locale);
    if (translated) {
      clientCache.set(getCacheKey(locale, normalizedText), translated);
      setClientTranslation(locale, normalizedText, translated);
    }
  }
}

function getResolvedText(locale: Locale, text: string) {
  const normalizedText = normalizeTranslationText(text);

  return (
    clientCache.get(getCacheKey(locale, normalizedText)) ??
    getLocalTextTranslation(normalizedText, locale) ??
    normalizedText
  );
}

async function requestMissingTranslations(
  missing: string[],
  locale: Locale,
): Promise<Record<string, string>> {
  const requestKey = `${locale}:${[...missing].sort().join(TEXT_LIST_SEPARATOR)}`;
  const existing = pendingCache.get(requestKey);
  if (existing) {
    return existing;
  }

  const requestPromise = fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts: missing,
      targetLocale: locale,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Translation request failed with ${response.status}`);
      }

      const payload = (await response.json()) as {
        translations?: Record<string, string>;
      };
      const translations = payload.translations ?? {};
      const resolved: Record<string, string> = {};

      for (const source of missing) {
        const normalizedSource = normalizeTranslationText(source);
        const translated = translations[normalizedSource] ?? normalizedSource;
        resolved[normalizedSource] = translated || normalizedSource;
        clientCache.set(
          getCacheKey(locale, normalizedSource),
          resolved[normalizedSource],
        );
        setClientTranslation(
          locale,
          normalizedSource,
          resolved[normalizedSource],
        );
      }

      return resolved;
    })
    .finally(() => {
      pendingCache.delete(requestKey);
    });

  pendingCache.set(requestKey, requestPromise);
  return requestPromise;
}

export function useLiveTextMap(texts: string[], locale: Locale) {
  const textsKey = useMemo(
    () => normalizeTextList(texts).join(TEXT_LIST_SEPARATOR),
    [texts],
  );
  const uniqueTexts = useMemo(
    () => (textsKey ? textsKey.split(TEXT_LIST_SEPARATOR) : []),
    [textsKey],
  );
  const [textMap, setTextMap] = useState<Record<string, string>>(() =>
    (primeLocalTranslations(uniqueTexts, locale),
    Object.fromEntries(uniqueTexts.map((text) => [text, getResolvedText(locale, text)]))),
  );

  useEffect(() => {
    primeLocalTranslations(uniqueTexts, locale);
    setTextMap(
      Object.fromEntries(uniqueTexts.map((text) => [text, getResolvedText(locale, text)])),
    );
  }, [locale, uniqueTexts]);

  useEffect(() => {
    if (locale === "ru" || uniqueTexts.length === 0) {
      return;
    }

    primeLocalTranslations(uniqueTexts, locale);

    const missing = uniqueTexts.filter(
      (text) =>
        !clientCache.has(getCacheKey(locale, text)) &&
        !hasClientTranslation(locale, text),
    );

    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    void requestMissingTranslations(missing, locale)
      .then(() => {
        if (cancelled) {
          return;
        }

        setTextMap((current) => ({
          ...current,
          ...Object.fromEntries(
            uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
          ),
        }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setTextMap((current) => current);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, uniqueTexts]);

  return textMap;
}
