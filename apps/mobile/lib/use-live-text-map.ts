import { useEffect, useMemo, useState } from 'react';
import { translateTexts } from './api';
import type { AppLanguage } from './i18n';
import { readScreenCache, writeScreenCache } from './screen-cache';

const translationCache = new Map<string, string>();
const hydratedLocales = new Set<AppLanguage>();
const persistedLocaleMaps = new Map<AppLanguage, Record<string, string>>();

function getCacheKey(locale: AppLanguage, text: string) {
  return `${locale}:${text}`;
}

function getTranslationCacheStorageKey(locale: AppLanguage) {
  return `live-translation:${locale}`;
}

function getResolvedText(locale: AppLanguage, text: string) {
  return translationCache.get(getCacheKey(locale, text)) ?? text;
}

async function hydrateLocaleCache(locale: AppLanguage) {
  if (hydratedLocales.has(locale)) {
    return;
  }

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

export function useLiveTextMap(texts: string[], locale: AppLanguage) {
  const uniqueTexts = useMemo(
    () => Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean))),
    [texts],
  );
  const [textMap, setTextMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
    ),
  );

  useEffect(() => {
    let cancelled = false;

    void hydrateLocaleCache(locale).then(() => {
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

  useEffect(() => {
    setTextMap(
      Object.fromEntries(
        uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
      ),
    );

    if (uniqueTexts.length === 0) {
      return;
    }

    const missing = uniqueTexts.filter(
      (text) => !translationCache.has(getCacheKey(locale, text)),
    );

    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    void translateTexts(missing, locale)
      .then((translations) => {
        if (cancelled) {
          return;
        }

        mergeTranslations(locale, translations);
        setTextMap(
          Object.fromEntries(
            uniqueTexts.map((text) => [text, getResolvedText(locale, text)]),
          ),
        );
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
