import { AuthSession, expireSession, getSession, saveSession } from "./auth";
import { readBrowserStorageItem, writeBrowserStorageItem } from "./browser-storage";
import { readClientCache, writeClientCache } from "./client-cache";
import {
  demoApiDownload,
  demoApiRequest,
  shouldUseDemoApi,
} from "./demo-api";
import { isDemoAccessToken } from "./demo-mode";
import { humanizeValidationError } from "./humanize-validation-error";
import { getRuntimeLocale } from "./runtime-locale";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
let sessionRefreshPromise: Promise<AuthSession | null> | null = null;
const API_CACHE_NAMESPACE_PREFIX = "smart:api-cache-namespace:";
const API_CACHE_UPDATED_EVENT = "smart-api-cache-updated";
const inFlightRequestCache = new Map<string, Promise<unknown>>();

type ApiRequestOptions = RequestInit & {
  token?: string;
  realBackend?: boolean;
  cacheTtlMs?: number;
  skipClientCache?: boolean;
  timeoutMs?: number;
};

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCacheNamespaceVersion(scope: "tenant" | "user", id?: string | null) {
  if (!id || !canUseBrowserStorage()) {
    return 0;
  }

  return Number(readBrowserStorageItem(`${API_CACHE_NAMESPACE_PREFIX}${scope}:${id}`) ?? "0") || 0;
}

function bumpCacheNamespaceVersion(scope: "tenant" | "user", id?: string | null) {
  if (!id || !canUseBrowserStorage()) {
    return;
  }

  const storageKey = `${API_CACHE_NAMESPACE_PREFIX}${scope}:${id}`;
  const current = Number(readBrowserStorageItem(storageKey) ?? "0") || 0;
  writeBrowserStorageItem(storageKey, String(current + 1));
}

function normalizeMethod(method?: string) {
  return (method ?? "GET").toUpperCase();
}

function isCacheableGetRequest(path: string, options?: ApiRequestOptions) {
  return (
    normalizeMethod(options?.method) === "GET" &&
    !options?.skipClientCache &&
    !/\/export(?:\/|$)/.test(path)
  );
}

function resolveCacheTtlMs(path: string, options?: ApiRequestOptions) {
  if (typeof options?.cacheTtlMs === "number") {
    return options.cacheTtlMs;
  }

  if (/\/auth\/me$/.test(path)) return 20_000;
  if (/\/auth\/bootstrap$/.test(path)) return 20_000;
  if (/\/bootstrap\/tasks$/.test(path)) return 20_000;
  if (/\/bootstrap\/attendance(?:\?|$)/.test(path)) return 15_000;
  if (/\/bootstrap\/employees$/.test(path)) return 30_000;
  if (/\/bootstrap\/schedule(?:\?|$)/.test(path)) return 30_000;
  if (/\/bootstrap\/dashboard$/.test(path)) return 15_000;
  if (/\/bootstrap\/analytics(?:\?|$)/.test(path)) return 20_000;
  if (/\/bootstrap\/organization$/.test(path)) return 60_000;
  if (/\/bootstrap\/news$/.test(path)) return 20_000;
  if (/\/bootstrap\/biometric(?:\?|$)/.test(path)) return 20_000;
  if (/\/notifications\/me\/unread-count$/.test(path)) return 15_000;
  if (/\/notifications\/me$/.test(path)) return 20_000;
  if (/\/devices\/me$/.test(path)) return 60_000;
  if (/\/push\/me$/.test(path)) return 60_000;
  if (/\/attendance\/(?:me\/status|team\/live)$/.test(path)) return 10_000;
  if (/\/attendance\/(?:me\/history|team\/history|team\/audit)(?:\?|$)/.test(path)) return 20_000;
  if (/\/attendance\/team\/anomalies$/.test(path)) return 20_000;
  if (/\/collaboration\/(?:overview|analytics)$/.test(path)) return 45_000;
  if (/\/collaboration\/announcements(?:\/(?:archive|me))?(?:\?|$)/.test(path)) return 30_000;
  if (/\/collaboration\/announcement-templates(?:\?|$)/.test(path)) return 45_000;
  if (/\/collaboration\/task-templates(?:\?|$)/.test(path)) return 45_000;
  if (/\/collaboration\/tasks(?:\/me)?(?:\?|$)/.test(path)) return 20_000;
  if (/\/collaboration\/(?:inbox\/me|inbox-summary\/me)(?:\?|$)/.test(path)) return 20_000;
  if (/\/collaboration\/chats(?:\/[^/]+)?(?:\?|$)/.test(path)) return 20_000;
  if (/\/requests\/me(?:\/(?:balances|calendar))?(?:\?|$)/.test(path)) return 30_000;
  if (/\/requests\/(?:inbox|policies|balances)(?:\?|$)/.test(path)) return 45_000;
  if (/\/biometric\/(?:policy|jobs\/(?:me|team))(?:\?|$)/.test(path)) return 20_000;
  if (/^\/employees(?:\/.*)?$/.test(path)) return 2 * 60_000;
  if (/\/schedule\/me(?:\?|$)/.test(path)) return 30_000;
  if (/\/org\/setup$/.test(path)) return 10 * 60_000;
  if (/\/org\/(?:companies|departments|locations|positions)(?:\?|$)/.test(path)) return 10 * 60_000;
  if (/\/schedule\/templates$/.test(path)) return 10 * 60_000;
  if (/\/schedule\/shifts$/.test(path)) return 60_000;
  if (/\/payroll\/(?:summary|policy|holidays)(?:\?|$)/.test(path)) return 60_000;
  if (/\/(?:diagnostics|observability)\/summary$/.test(path)) return 15_000;
  return 60_000;
}

function buildRequestCacheKey(path: string, options?: ApiRequestOptions) {
  const currentSession = getSession();
  const tenantId = currentSession?.user.tenantId ?? "public";
  const userId = currentSession?.user.id ?? "public";
  const tenantVersion = readCacheNamespaceVersion("tenant", currentSession?.user.tenantId);
  const userVersion = readCacheNamespaceVersion("user", currentSession?.user.id);

  return [
    "api-cache:v2",
    normalizeMethod(options?.method),
    path,
    `tenant:${tenantId}:${tenantVersion}`,
    `user:${userId}:${userVersion}`,
  ].join("|");
}

function resolveRequestTimeoutMs(path: string, options?: ApiRequestOptions) {
  if (typeof options?.timeoutMs === "number") {
    return options.timeoutMs;
  }

  const method = normalizeMethod(options?.method);

  if (method === "GET" || method === "HEAD") {
    return 15_000;
  }

  if (options?.body instanceof FormData) {
    return 60_000;
  }

  return 30_000;
}

async function fetchAndCacheApiRequest<T>(
  cacheKey: string,
  path: string,
  options?: ApiRequestOptions,
) {
  const existingRequest = inFlightRequestCache.get(cacheKey) as Promise<T> | undefined;
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    let response = await performApiFetch(path, options);

    if (!response.ok && response.status === 401 && options?.token && typeof window !== "undefined") {
      const refreshedSession = await refreshStoredSession();

      if (refreshedSession?.accessToken) {
        response = await performApiFetch(path, options, refreshedSession.accessToken);
      }
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        options?.token &&
        typeof window !== "undefined" &&
        shouldExpireSessionForPath(path)
      ) {
        expireSession();
      }

      throw new Error(
        await getApiErrorMessage(response, { hasAuthenticatedSession: Boolean(options?.token) }),
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json()) as T;
    writeClientCache(cacheKey, payload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(API_CACHE_UPDATED_EVENT, {
          detail: { cacheKey, path, payload },
        }),
      );
    }

    return payload;
  })();

  inFlightRequestCache.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequestCache.delete(cacheKey);
  }
}

async function performApiFetch(
  path: string,
  options?: ApiRequestOptions,
  overrideToken?: string,
) {
  const headers = new Headers(options?.headers ?? {});
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = overrideToken ?? options?.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers,
    signal: options?.signal ?? AbortSignal.timeout(resolveRequestTimeoutMs(path, options)),
  });
}

async function performApiDownloadFetch(
  path: string,
  options?: ApiRequestOptions,
  overrideToken?: string,
) {
  const headers = new Headers(options?.headers ?? {});
  const token = overrideToken ?? options?.token;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers,
    signal: options?.signal ?? AbortSignal.timeout(resolveRequestTimeoutMs(path, options)),
  });
}

async function refreshStoredSession(): Promise<AuthSession | null> {
  if (typeof window === "undefined") return null;
  const currentSession = getSession();
  if (!currentSession?.refreshToken) return null;
  if (isDemoAccessToken(currentSession.accessToken)) {
    return currentSession;
  }

  if (!sessionRefreshPromise) {
    sessionRefreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
        });

        if (!response.ok) {
          return null;
        }

        const nextSession = (await response.json()) as AuthSession;
        saveSession(nextSession);
        return nextSession;
      } catch {
        return null;
      } finally {
        sessionRefreshPromise = null;
      }
    })();
  }

  return sessionRefreshPromise;
}

function humanizeAuthErrorMessage(message: string): string {
  const locale = getRuntimeLocale();
  switch (message) {
    case "Account with this email is not registered.":
      return locale === "ru" ? "Аккаунт с таким email не зарегистрирован." : "No account is registered with this email.";
    case "Account with this phone is not registered.":
      return locale === "ru" ? "Аккаунт с таким телефоном не зарегистрирован." : "No account is registered with this phone.";
    case "Invalid password.":
      return locale === "ru" ? "Неверный пароль." : "Invalid password.";
    case "This account is inactive.":
      return locale === "ru" ? "Аккаунт неактивен. Обратись к администратору." : "This account is inactive. Contact your administrator.";
    case "Account identifier is required.":
      return locale === "ru" ? "Укажи email или телефон." : "Enter your email or phone.";
    case "Multiple workspaces found for this account. Contact support or use a direct invite link.":
      return locale === "ru"
        ? "Для этого аккаунта найдено несколько рабочих пространств. Открой прямую ссылку-приглашение или обратись к администратору."
        : "Multiple workspaces were found for this account. Open a direct invite link or contact your administrator.";
    default:
      return humanizeValidationError(message);
  }
}

async function getApiErrorMessage(
  response: Response,
  options?: { hasAuthenticatedSession?: boolean },
): Promise<string> {
  const locale = getRuntimeLocale();
  const text = await response.text();

  if (response.status === 401 && options?.hasAuthenticatedSession) {
    return locale === "ru"
      ? "Ошибка 401. Сессия истекла или токен недействителен. Войди заново."
      : "Error 401. The session expired or the token is invalid. Sign in again.";
  }

  if (text) {
    try {
      const payload = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(payload.message) && payload.message.length) {
        return humanizeValidationError(payload.message);
      }

      if (typeof payload.message === "string" && payload.message.trim()) {
        return humanizeAuthErrorMessage(payload.message);
      }
    } catch {
      return text;
    }
  }

  return locale === "ru"
    ? `Ошибка ${response.status}. Запрос не выполнен.`
    : `Error ${response.status}. The request failed.`;
}

function shouldExpireSessionForPath(path: string): boolean {
  return path !== "/auth/bootstrap";
}

export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> {
  if (!options?.realBackend && shouldUseDemoApi(path, options?.token)) {
    return demoApiRequest<T>(path, options);
  }

  const cacheableGet = isCacheableGetRequest(path, options);

  if (cacheableGet) {
    const cacheKey = buildRequestCacheKey(path, options);
    const cached = readClientCache<T>(cacheKey, resolveCacheTtlMs(path, options));

    if (cached) {
      if (cached.isStale) {
        void fetchAndCacheApiRequest<T>(cacheKey, path, options).catch(() => undefined);
      }

      return cached.value;
    }

    return fetchAndCacheApiRequest<T>(cacheKey, path, options);
  }

  let response = await performApiFetch(path, options);

  if (!response.ok && response.status === 401 && options?.token && typeof window !== "undefined") {
    const refreshedSession = await refreshStoredSession();

    if (refreshedSession?.accessToken) {
      response = await performApiFetch(path, options, refreshedSession.accessToken);
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      options?.token &&
      typeof window !== "undefined" &&
      shouldExpireSessionForPath(path)
    ) {
      expireSession();
    }

    throw new Error(await getApiErrorMessage(response, { hasAuthenticatedSession: Boolean(options?.token) }));
  }

  if (response.status === 204) {
    if (normalizeMethod(options?.method) !== "GET") {
      const currentSession = getSession();
      bumpCacheNamespaceVersion("tenant", currentSession?.user.tenantId);
      bumpCacheNamespaceVersion("user", currentSession?.user.id);
    }

    return undefined as T;
  }

  const payload = (await response.json()) as T;

  if (normalizeMethod(options?.method) !== "GET") {
    const currentSession = getSession();
    bumpCacheNamespaceVersion("tenant", currentSession?.user.tenantId);
    bumpCacheNamespaceVersion("user", currentSession?.user.id);
  }

  return payload;
}

export async function apiDownload(
  path: string,
  options?: RequestInit & { token?: string; realBackend?: boolean },
): Promise<{ blob: Blob; fileName: string | null }> {
  if (!options?.realBackend && shouldUseDemoApi(path, options?.token)) {
    return demoApiDownload(path, options);
  }

  let response = await performApiDownloadFetch(path, options);

  if (!response.ok && response.status === 401 && options?.token && typeof window !== "undefined") {
    const refreshedSession = await refreshStoredSession();

    if (refreshedSession?.accessToken) {
      response = await performApiDownloadFetch(path, options, refreshedSession.accessToken);
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      options?.token &&
      typeof window !== "undefined" &&
      shouldExpireSessionForPath(path)
    ) {
      expireSession();
    }
    throw new Error(await getApiErrorMessage(response, { hasAuthenticatedSession: Boolean(options?.token) }));
  }

  const contentDisposition = response.headers.get("content-disposition");
  const fileNameMatch = contentDisposition?.match(/filename="([^"]+)"/);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] ?? null,
  };
}
