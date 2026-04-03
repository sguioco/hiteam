"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "./i18n";

const clientCache = new Map<string, string>();

function getCacheKey(locale: Locale, text: string) {
  return `${locale}:${text}`;
}

export function useLiveTextMap(texts: string[], locale: Locale) {
  const uniqueTexts = useMemo(
    () => Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean))),
    [texts],
  );
  const [textMap, setTextMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      uniqueTexts.map((text) => [text, clientCache.get(getCacheKey(locale, text)) ?? text]),
    ),
  );

  useEffect(() => {
    setTextMap(
      Object.fromEntries(
        uniqueTexts.map((text) => [text, clientCache.get(getCacheKey(locale, text)) ?? text]),
      ),
    );
  }, [locale, uniqueTexts]);

  useEffect(() => {
    if (locale === "ru" || uniqueTexts.length === 0) {
      return;
    }

    const missing = uniqueTexts.filter(
      (text) => !clientCache.has(getCacheKey(locale, text)),
    );

    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    void fetch("/api/translate", {
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

        return (await response.json()) as { translations?: Record<string, string> };
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const translations = payload.translations ?? {};
        for (const [source, translated] of Object.entries(translations)) {
          clientCache.set(getCacheKey(locale, source), translated || source);
        }

        setTextMap((current) => ({
          ...current,
          ...Object.fromEntries(
            uniqueTexts.map((text) => [
              text,
              clientCache.get(getCacheKey(locale, text)) ?? text,
            ]),
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

