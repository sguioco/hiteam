import type { Locale } from "./i18n";
import { getLocalTextTranslation } from "./local-text-translation";

type TranslationResponse = Record<string, string>;

type ProviderResult = {
  translatedText: string;
};

const translationCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string>>();

function getCacheKey(text: string, targetLocale: Locale) {
  return `${targetLocale}:${text}`;
}

function hasCyrillic(text: string) {
  return /[А-Яа-яЁё]/.test(text);
}

function hasLatin(text: string) {
  return /[A-Za-z]/.test(text);
}

function shouldTranslate(text: string, targetLocale: Locale) {
  if (!text.trim()) {
    return false;
  }

  return targetLocale === "en" ? hasCyrillic(text) : hasLatin(text);
}

async function translateViaLibreTranslate(
  text: string,
  targetLocale: Locale,
): Promise<ProviderResult | null> {
  const baseUrl = process.env.LIBRETRANSLATE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target: targetLocale,
      format: "text",
      api_key: process.env.LIBRETRANSLATE_API_KEY?.trim() || undefined,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate failed with ${response.status}`);
  }

  const payload = (await response.json()) as { translatedText?: string };
  if (!payload.translatedText?.trim()) {
    return null;
  }

  return {
    translatedText: payload.translatedText,
  };
}

async function translateViaMyMemory(
  text: string,
  targetLocale: Locale,
): Promise<ProviderResult | null> {
  const sourceLocale = targetLocale === "en" ? "ru" : "en";
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${sourceLocale}|${targetLocale}`);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MyMemory failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    responseData?: { translatedText?: string };
  };
  const translatedText = payload.responseData?.translatedText?.trim();
  if (!translatedText) {
    return null;
  }

  return { translatedText };
}

async function translateViaGoogleGtx(
  text: string,
  targetLocale: Locale,
): Promise<ProviderResult | null> {
  const sourceLocale = targetLocale === "en" ? "ru" : "en";
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLocale);
  url.searchParams.set("tl", targetLocale);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google GTX failed with ${response.status}`);
  }

  const payload = (await response.json()) as unknown[];
  const chunks = Array.isArray(payload[0]) ? (payload[0] as unknown[]) : [];
  const translatedText = chunks
    .map((chunk) =>
      Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "",
    )
    .join("")
    .trim();

  if (!translatedText) {
    return null;
  }

  return { translatedText };
}

async function translateSingleText(text: string, targetLocale: Locale) {
  if (!shouldTranslate(text, targetLocale)) {
    return text;
  }

  const localTranslation = getLocalTextTranslation(text, targetLocale);
  if (localTranslation) {
    translationCache.set(getCacheKey(text, targetLocale), localTranslation);
    return localTranslation;
  }

  const cacheKey = getCacheKey(text, targetLocale);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightCache.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const translationPromise = (async () => {
    let translatedText = text;

    try {
      const libre = await translateViaLibreTranslate(text, targetLocale);
      translatedText = libre?.translatedText ?? translatedText;
    } catch {
      try {
        const myMemory = await translateViaMyMemory(text, targetLocale);
        translatedText = myMemory?.translatedText ?? translatedText;
      } catch {
        try {
          const google = await translateViaGoogleGtx(text, targetLocale);
          translatedText = google?.translatedText ?? translatedText;
        } catch {
          translatedText = text;
        }
      }
    }

    translationCache.set(cacheKey, translatedText);
    inFlightCache.delete(cacheKey);
    return translatedText;
  })();

  inFlightCache.set(cacheKey, translationPromise);
  return translationPromise;
}

export async function translateTexts(
  texts: string[],
  targetLocale: Locale,
): Promise<TranslationResponse> {
  const uniqueTexts = Array.from(
    new Set(texts.map((text) => text.trim()).filter(Boolean)),
  );

  const entries = await Promise.all(
    uniqueTexts.map(async (text) => [
      text,
      await translateSingleText(text, targetLocale),
    ] as const),
  );

  return Object.fromEntries(entries);
}
