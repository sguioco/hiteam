import { AuthSession, expireSession, getSession, saveSession } from "./auth";
import {
  demoApiDownload,
  demoApiRequest,
  shouldUseDemoApi,
} from "./demo-api";
import { isDemoAccessToken } from "./demo-mode";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
let sessionRefreshPromise: Promise<AuthSession | null> | null = null;

async function performApiFetch(
  path: string,
  options?: RequestInit & { token?: string },
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
  });
}

async function performApiDownloadFetch(
  path: string,
  options?: RequestInit & { token?: string },
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

async function getApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  if (response.status === 401) {
    return "Ошибка 401. Сессия истекла или токен недействителен. Войди заново.";
  }

  if (text) {
    try {
      const payload = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(payload.message) && payload.message.length) {
        return payload.message.join(", ");
      }

      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    } catch {
      return text;
    }
  }

  return `Ошибка ${response.status}. Запрос не выполнен.`;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  if (shouldUseDemoApi(options?.token)) {
    return demoApiRequest<T>(path, options);
  }

  let response = await performApiFetch(path, options);

  if (!response.ok && response.status === 401 && options?.token && typeof window !== "undefined") {
    const refreshedSession = await refreshStoredSession();

    if (refreshedSession?.accessToken) {
      response = await performApiFetch(path, options, refreshedSession.accessToken);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && options?.token && typeof window !== "undefined") {
      expireSession();
    }

    throw new Error(await getApiErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<{ blob: Blob; fileName: string | null }> {
  if (shouldUseDemoApi(options?.token)) {
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
    if (response.status === 401 && options?.token && typeof window !== "undefined") {
      expireSession();
    }
    throw new Error(await getApiErrorMessage(response));
  }

  const contentDisposition = response.headers.get("content-disposition");
  const fileNameMatch = contentDisposition?.match(/filename="([^"]+)"/);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] ?? null,
  };
}
