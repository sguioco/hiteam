import { Injectable } from '@nestjs/common';
import type { SupportedTranslationLocale } from './dto/translate-texts.dto';

type TranslationResponse = Record<string, string>;

type ProviderResult = {
  translatedText: string;
};

@Injectable()
export class TranslationService {
  private readonly translationCache = new Map<string, string>();
  private readonly inFlightCache = new Map<string, Promise<string>>();

  private getCacheKey(text: string, targetLocale: SupportedTranslationLocale) {
    return `${targetLocale}:${text}`;
  }

  private async translateViaLibreTranslate(
    text: string,
    targetLocale: SupportedTranslationLocale,
  ): Promise<ProviderResult | null> {
    const baseUrl = process.env.LIBRETRANSLATE_URL?.trim();
    if (!baseUrl) {
      return null;
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLocale,
        format: 'text',
        api_key: process.env.LIBRETRANSLATE_API_KEY?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate failed with ${response.status}`);
    }

    const payload = (await response.json()) as { translatedText?: string };
    const translatedText = payload.translatedText?.trim();
    if (!translatedText) {
      return null;
    }

    return { translatedText };
  }

  private async translateViaGoogleGtx(
    text: string,
    targetLocale: SupportedTranslationLocale,
  ): Promise<ProviderResult | null> {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', targetLocale);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google GTX failed with ${response.status}`);
    }

    const payload = (await response.json()) as unknown[];
    const chunks = Array.isArray(payload[0]) ? (payload[0] as unknown[]) : [];
    const translatedText = chunks
      .map((chunk) =>
        Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : '',
      )
      .join('')
      .trim();

    if (!translatedText) {
      return null;
    }

    return { translatedText };
  }

  private async translateSingleText(
    text: string,
    targetLocale: SupportedTranslationLocale,
  ) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return text;
    }

    const cacheKey = this.getCacheKey(normalizedText, targetLocale);
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.inFlightCache.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const translationPromise = (async () => {
      let translatedText = normalizedText;

      try {
        const libre = await this.translateViaLibreTranslate(
          normalizedText,
          targetLocale,
        );
        translatedText = libre?.translatedText ?? translatedText;
      } catch {
        try {
          const google = await this.translateViaGoogleGtx(
            normalizedText,
            targetLocale,
          );
          translatedText = google?.translatedText ?? translatedText;
        } catch {
          translatedText = normalizedText;
        }
      }

      this.translationCache.set(cacheKey, translatedText);
      this.inFlightCache.delete(cacheKey);
      return translatedText;
    })();

    this.inFlightCache.set(cacheKey, translationPromise);
    return translationPromise;
  }

  async translateTexts(
    texts: string[],
    targetLocale: SupportedTranslationLocale,
  ): Promise<TranslationResponse> {
    const uniqueTexts = Array.from(
      new Set(texts.map((text) => text.trim()).filter(Boolean)),
    );

    const entries = await Promise.all(
      uniqueTexts.map(async (text) => [
        text,
        await this.translateSingleText(text, targetLocale),
      ] as const),
    );

    return Object.fromEntries(entries);
  }
}
