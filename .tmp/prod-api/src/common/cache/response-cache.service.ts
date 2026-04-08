import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryCacheEntry = {
  expiresAt: number;
  payload: string;
};

@Injectable()
export class ResponseCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ResponseCacheService.name);
  private readonly redis: Redis | null;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly memoryNamespaces = new Map<string, number>();

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL')?.trim();

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
      this.logger.warn(`Redis cache unavailable, using memory fallback: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (!this.redis) {
      return;
    }

    await this.redis.quit().catch(() => undefined);
  }

  async getNamespaceVersion(scope: 'tenant' | 'user', id?: string | null): Promise<number> {
    if (!id) {
      return 0;
    }

    const namespaceKey = this.buildNamespaceKey(scope, id);

    if (this.redis) {
      try {
        await this.redis.connect().catch(() => undefined);
        const stored = await this.redis.get(namespaceKey);
        return Number(stored ?? '0') || 0;
      } catch {
        // Fall back to memory namespace store.
      }
    }

    return this.memoryNamespaces.get(namespaceKey) ?? 0;
  }

  async bumpNamespace(scope: 'tenant' | 'user', id?: string | null): Promise<void> {
    if (!id) {
      return;
    }

    const namespaceKey = this.buildNamespaceKey(scope, id);

    if (this.redis) {
      try {
        await this.redis.connect().catch(() => undefined);
        await this.redis.incr(namespaceKey);
        return;
      } catch {
        // Fall back to memory namespace store.
      }
    }

    this.memoryNamespaces.set(namespaceKey, (this.memoryNamespaces.get(namespaceKey) ?? 0) + 1);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        await this.redis.connect().catch(() => undefined);
        const payload = await this.redis.get(key);
        return payload ? (JSON.parse(payload) as T) : null;
      } catch {
        // Fall back to memory cache below.
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return JSON.parse(entry.payload) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);

    if (this.redis) {
      try {
        await this.redis.connect().catch(() => undefined);
        await this.redis.set(key, payload, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall back to memory cache below.
      }
    }

    this.memoryCache.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      payload,
    });
  }

  private buildNamespaceKey(scope: 'tenant' | 'user', id: string) {
    return `smart:http-cache:ns:${scope}:${id}`;
  }
}
