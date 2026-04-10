import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import {
  SUPPORTED_TRANSLATION_LOCALES,
  type SupportedTranslationLocale,
} from './dto/translate-texts.dto';

type TranslationResponse = Record<string, string>;

type ProviderResult = {
  translatedText: string;
};

type MemoryCacheEntry = {
  expiresAt: number;
  value: string;
};

const TRANSLATION_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;
const TRANSLATION_FAILURE_TTL_SECONDS = 60 * 5;

@Injectable()
export class TranslationService implements OnModuleDestroy {
  private readonly logger = new Logger(TranslationService.name);
  private readonly translationCache = new Map<string, MemoryCacheEntry>();
  private readonly inFlightCache = new Map<string, Promise<string>>();
  private readonly redis: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      this.redis = null;
      return;
    }

    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      family: 0,
    });

    this.redis.on('error', (error) => {
      this.logger.warn(
        `Redis translation cache unavailable, using memory fallback: ${error.message}`,
      );
    });
  }

  async onModuleDestroy() {
    if (!this.redis) {
      return;
    }

    await this.redis.quit().catch(() => undefined);
  }

  private getCacheKey(text: string, targetLocale: SupportedTranslationLocale) {
    const digest = createHash('sha256').update(text).digest('hex');
    return `smart:translation:${targetLocale}:${digest}`;
  }

  private getCachedFromMemory(cacheKey: string) {
    const cached = this.translationCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.translationCache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  private async getCachedTranslation(cacheKey: string) {
    const memoryValue = this.getCachedFromMemory(cacheKey);
    if (memoryValue !== null) {
      return memoryValue;
    }

    if (!this.redis) {
      return null;
    }

    try {
      await this.redis.connect().catch(() => undefined);
      const redisValue = await this.redis.get(cacheKey);
      if (!redisValue) {
        return null;
      }

      this.translationCache.set(cacheKey, {
        expiresAt: Date.now() + TRANSLATION_CACHE_TTL_SECONDS * 1000,
        value: redisValue,
      });
      return redisValue;
    } catch {
      return null;
    }
  }

  private async setCachedTranslation(
    cacheKey: string,
    value: string,
    ttlSeconds: number,
  ) {
    this.translationCache.set(cacheKey, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value,
    });

    if (!this.redis) {
      return;
    }

    try {
      await this.redis.connect().catch(() => undefined);
      await this.redis.set(cacheKey, value, 'EX', ttlSeconds);
    } catch {
      // Keep the memory cache as a fallback.
    }
  }

  private async translateViaLibreTranslate(
    text: string,
    targetLocale: SupportedTranslationLocale,
  ): Promise<ProviderResult | null> {
    const baseUrl = this.configService.get<string>('LIBRETRANSLATE_URL')?.trim();
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
        api_key:
          this.configService.get<string>('LIBRETRANSLATE_API_KEY')?.trim() ||
          undefined,
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

  private async resolveTranslation(
    text: string,
    targetLocale: SupportedTranslationLocale,
  ) {
    const providers = [
      () => this.translateViaLibreTranslate(text, targetLocale),
      () => this.translateViaGoogleGtx(text, targetLocale),
    ];

    for (const provider of providers) {
      try {
        const result = await provider();
        if (result?.translatedText?.trim()) {
          return {
            translatedText: result.translatedText.trim(),
            translated: true,
          };
        }
      } catch {
        // Fall through to the next provider.
      }
    }

    return {
      translatedText: text,
      translated: false,
    };
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
    const cached = await this.getCachedTranslation(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const inFlight = this.inFlightCache.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const translationPromise = (async () => {
      const result = await this.resolveTranslation(normalizedText, targetLocale);

      await this.setCachedTranslation(
        cacheKey,
        result.translatedText,
        result.translated
          ? TRANSLATION_CACHE_TTL_SECONDS
          : TRANSLATION_FAILURE_TTL_SECONDS,
      );
      this.inFlightCache.delete(cacheKey);
      return result.translatedText;
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
      uniqueTexts.map(
        async (text) =>
          [text, await this.translateSingleText(text, targetLocale)] as const,
      ),
    );

    return Object.fromEntries(entries);
  }

  async prewarmTranslations(
    texts: Array<string | null | undefined>,
    locales: readonly SupportedTranslationLocale[] = SUPPORTED_TRANSLATION_LOCALES,
  ) {
    const uniqueTexts = Array.from(
      new Set(texts.map((text) => text?.trim() ?? '').filter(Boolean)),
    );

    if (uniqueTexts.length === 0) {
      return;
    }

    await Promise.allSettled(
      locales.map((locale) => this.translateTexts(uniqueTexts, locale)),
    );
  }
}
