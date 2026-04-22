import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { Request } from 'express';
import { JwtUser } from '../interfaces/jwt-user.interface';
import { ResponseCacheService } from './response-cache.service';

const DEFAULT_TTL_SECONDS = 60;
const TTL_RULES: Array<{ pattern: RegExp; ttlSeconds: number }> = [
  { pattern: /\/auth\/me$/, ttlSeconds: 20 },
  { pattern: /\/auth\/bootstrap$/, ttlSeconds: 20 },
  { pattern: /\/bootstrap\/tasks$/, ttlSeconds: 20 },
  { pattern: /\/bootstrap\/attendance$/, ttlSeconds: 15 },
  { pattern: /\/bootstrap\/employees$/, ttlSeconds: 30 },
  { pattern: /\/bootstrap\/schedule$/, ttlSeconds: 30 },
  { pattern: /\/bootstrap\/dashboard$/, ttlSeconds: 15 },
  { pattern: /\/bootstrap\/analytics(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/bootstrap\/organization$/, ttlSeconds: 60 },
  { pattern: /\/bootstrap\/news$/, ttlSeconds: 20 },
  { pattern: /\/bootstrap\/leaderboard$/, ttlSeconds: 20 },
  { pattern: /\/bootstrap\/biometric(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/notifications\/me\/unread-count$/, ttlSeconds: 15 },
  { pattern: /\/notifications\/me$/, ttlSeconds: 20 },
  { pattern: /\/devices\/me$/, ttlSeconds: 60 },
  { pattern: /\/push\/me$/, ttlSeconds: 60 },
  { pattern: /\/attendance\/(?:me\/status|team\/live)$/, ttlSeconds: 10 },
  { pattern: /\/attendance\/(?:me\/history|team\/history|team\/audit)(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/attendance\/team\/anomalies$/, ttlSeconds: 20 },
  { pattern: /\/collaboration\/overview$/, ttlSeconds: 45 },
  { pattern: /\/collaboration\/analytics$/, ttlSeconds: 45 },
  { pattern: /\/collaboration\/announcements(?:\/(?:archive|me))?(?:\?|$)/, ttlSeconds: 30 },
  { pattern: /\/collaboration\/announcement-templates(?:\?|$)/, ttlSeconds: 45 },
  { pattern: /\/collaboration\/task-templates(?:\?|$)/, ttlSeconds: 45 },
  { pattern: /\/collaboration\/tasks(?:\/me)?(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/collaboration\/(?:inbox\/me|inbox-summary\/me)(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/collaboration\/chats(?:\/[^/]+)?(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/leaderboard\/overview$/, ttlSeconds: 20 },
  { pattern: /\/requests\/me(?:\/(?:balances|calendar))?(?:\?|$)/, ttlSeconds: 30 },
  { pattern: /\/requests\/(?:inbox|policies|balances)(?:\?|$)/, ttlSeconds: 45 },
  { pattern: /\/biometric\/(?:policy|jobs\/(?:me|team))(?:\?|$)/, ttlSeconds: 20 },
  { pattern: /\/employees(?:\/.*)?$/, ttlSeconds: 120 },
  { pattern: /\/schedule\/me(?:\?|$)/, ttlSeconds: 30 },
  { pattern: /\/org\/setup$/, ttlSeconds: 300 },
  { pattern: /\/org\/(?:companies|departments|locations|positions)(?:\?|$)/, ttlSeconds: 300 },
  { pattern: /\/schedule\/templates$/, ttlSeconds: 300 },
  { pattern: /\/schedule\/shifts$/, ttlSeconds: 60 },
  { pattern: /\/payroll\/(?:summary|policy|holidays)(?:\?|$)/, ttlSeconds: 60 },
  { pattern: /\/diagnostics\/summary$/, ttlSeconds: 15 },
  { pattern: /\/observability\/summary$/, ttlSeconds: 15 },
];

@Injectable()
export class HttpResponseCacheInterceptor implements NestInterceptor {
  constructor(private readonly responseCacheService: ResponseCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const method = (request.method ?? 'GET').toUpperCase();

    if (method === 'GET' && this.isCacheableGetRequest(request)) {
      return from(this.resolveCachedResponse(request)).pipe(
        mergeMap((cached) => {
          if (cached.hit) {
            return of(cached.value);
          }

          return next.handle().pipe(
            mergeMap((value) =>
              from(this.storeCachedResponse(cached.key, request.path, value)).pipe(
                mergeMap(() => of(value)),
              ),
            ),
          );
        }),
      );
    }

    if (this.isMutationMethod(method)) {
      return next.handle().pipe(
        mergeMap((value) =>
          from(this.bumpNamespaces(request)).pipe(
            mergeMap(() => of(value)),
          ),
        ),
      );
    }

    return next.handle();
  }

  private async resolveCachedResponse(request: Request & { user?: JwtUser }) {
    const key = await this.buildCacheKey(request);
    const value = await this.responseCacheService.get<unknown>(key);
    return {
      hit: value !== null,
      key,
      value,
    };
  }

  private async storeCachedResponse(cacheKey: string, path: string, value: unknown) {
    if (!this.isSerializablePayload(value)) {
      return;
    }

    await this.responseCacheService.set(cacheKey, value, this.resolveTtlSeconds(path));
  }

  private async buildCacheKey(request: Request & { user?: JwtUser }) {
    const tenantId = request.user?.tenantId ?? 'public';
    const userId = request.user?.sub ?? 'public';
    const tenantVersion = await this.responseCacheService.getNamespaceVersion('tenant', request.user?.tenantId);
    const userVersion = await this.responseCacheService.getNamespaceVersion('user', request.user?.sub);

    return [
      'smart:http-cache:v1',
      request.path,
      this.normalizeQuery(request.query as Record<string, unknown>),
      `tenant:${tenantId}:${tenantVersion}`,
      `user:${userId}:${userVersion}`,
    ].join('|');
  }

  private async bumpNamespaces(request: Request & { user?: JwtUser }) {
    await Promise.all([
      this.responseCacheService.bumpNamespace('tenant', request.user?.tenantId),
      this.responseCacheService.bumpNamespace('user', request.user?.sub),
    ]);
  }

  private isCacheableGetRequest(request: Request) {
    const path = request.path ?? '';
    if (!path || path.endsWith('/health')) {
      return false;
    }

    if (/\/export(?:\/|$)/.test(path)) {
      return false;
    }

    return true;
  }

  private isMutationMethod(method: string) {
    return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  }

  private isSerializablePayload(value: unknown) {
    if (value instanceof StreamableFile) {
      return false;
    }

    if (Buffer.isBuffer(value)) {
      return false;
    }

    return (
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value) ||
      Array.isArray(value) ||
      typeof value === 'object'
    );
  }

  private normalizeQuery(query: Record<string, unknown>) {
    return Object.keys(query)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${key}=${this.stringifyQueryValue(query[key])}`)
      .join('&');
  }

  private stringifyQueryValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.stringifyQueryValue(item)).join(',');
    }

    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => `${key}:${this.stringifyQueryValue((value as Record<string, unknown>)[key])}`)
        .join(',');
    }

    return String(value ?? '');
  }

  private resolveTtlSeconds(path: string) {
    return TTL_RULES.find((rule) => rule.pattern.test(path))?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  }
}
