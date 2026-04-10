import { useEffect, useMemo, useState } from 'react';
import { translateTexts } from './api';
import type { AppLanguage } from './i18n';
import { readScreenCache, writeScreenCache } from './screen-cache';

const translationCache = new Map<string, string>();
const hydratedLocales = new Set<AppLanguage>();
const hydrationPromises = new Map<AppLanguage, Promise<void>>();
const persistedLocaleMaps = new Map<AppLanguage, Record<string, string>>();
const translationRequestCache = new Map<string, Promise<Record<string, string>>>();
const TRANSLATION_BATCH_SIZE = 100;

function getCacheKey(locale: AppLanguage, text: string) {
  return `${locale}:${text}`;
}

export function hasResolvedLiveText(locale: AppLanguage, text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return true;
  }

  return translationCache.has(getCacheKey(locale, normalized));
}

function getTranslationCacheStorageKey(locale: AppLanguage) {
  return `live-translation:${locale}`;
}

function normalizeTexts(texts: string[]) {
  return Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));
}

function getResolvedText(locale: AppLanguage, text: string) {
  return translationCache.get(getCacheKey(locale, text)) ?? text;
}

async function hydrateLocaleCache(locale: AppLanguage) {
  if (hydratedLocales.has(locale)) {
    return;
  }

  const existingPromise = hydrationPromises.get(locale);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    const cached =
      await readScreenCache<Record<string, string>>(
        getTranslationCacheStorageKey(locale),
      );
    const localeMap = cached?.value ?? {};

    persistedLocaleMaps.set(locale, localeMap);
    for (const [source, translated] of Object.entries(localeMap)) {
      translationCache.set(getCacheKey(locale, source), translated || source);
    }

    hydratedLocales.add(locale);
    hydrationPromises.delete(locale);
  })();

  hydrationPromises.set(locale, promise);
  return promise;
}

async function persistLocaleCache(locale: AppLanguage) {
  await writeScreenCache(
    getTranslationCacheStorageKey(locale),
    persistedLocaleMaps.get(locale) ?? {},
  );
}

function mergeTranslations(
  locale: AppLanguage,
  nextTranslations: Record<string, string>,
) {
  const localeMap = {
    ...(persistedLocaleMaps.get(locale) ?? {}),
  };

  for (const [source, translated] of Object.entries(nextTranslations)) {
    if (!source.trim()) {
      continue;
    }

    const resolved = translated?.trim() || source;
    localeMap[source] = resolved;
    translationCache.set(getCacheKey(locale, source), resolved);
  }

  persistedLocaleMaps.set(locale, localeMap);
  void persistLocaleCache(locale);
}

async function requestMissingTranslations(
  locale: AppLanguage,
  texts: string[],
) {
  const missingTexts = normalizeTexts(texts);
  if (missingTexts.length === 0) {
    return {};
  }

  const requestKey = `${locale}:${missingTexts.slice().sort().join('\u0001')}`;
  const existingRequest = translationRequestCache.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = Promise.all(
    Array.from(
      { length: Math.ceil(missingTexts.length / TRANSLATION_BATCH_SIZE) },
      (_, index) =>
        missingTexts.slice(
          index * TRANSLATION_BATCH_SIZE,
          (index + 1) * TRANSLATION_BATCH_SIZE,
        ),
    ).map((chunk) => translateTexts(chunk, locale)),
  )
    .then((responses) => Object.assign({}, ...responses))
    .finally(() => {
      translationRequestCache.delete(requestKey);
    });

  translationRequestCache.set(requestKey, requestPromise);
  return requestPromise;
}

export async function primeLiveTextMap(texts: string[], locale: AppLanguage) {
  const uniqueTexts = normalizeTexts(texts);
  if (uniqueTexts.length === 0) {
    return {};
  }

  await hydrateLocaleCache(locale);

  const missing = uniqueTexts.filter(
    (text) => !translationCache.has(getCacheKey(locale, text)),
  );

  if (missing.length > 0) {
    try {
      const translations = await requestMissingTranslations(locale, missing);
      mergeTranslations(locale, translations);
    } catch {
      // Keep original strings when the translation API is temporarily unavailable.
    }
  }

  return Object.fromEntries(
    uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
  );
}

export function useLiveTextMap(texts: string[], locale: AppLanguage) {
  const uniqueTexts = useMemo(() => normalizeTexts(texts), [texts]);
  const [textMap, setTextMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
    ),
  );

  useEffect(() => {
    let cancelled = false;

    setTextMap(
      Object.fromEntries(
        uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
      ),
    );

    void primeLiveTextMap(uniqueTexts, locale)
      .then((resolved) => {
        if (cancelled) {
          return;
        }

        setTextMap(resolved);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setTextMap(
          Object.fromEntries(
            uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [locale, uniqueTexts]);

  return textMap;
}
