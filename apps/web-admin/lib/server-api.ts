import type { AuthSession } from "./auth";

const SERVER_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";
const SERVER_API_TIMEOUT_MS = Number(process.env.INTERNAL_API_TIMEOUT_MS ?? 12000);

type ServerApiOptions = RequestInit & {
  token?: string;
  timeoutMs?: number;
};

function createServerRequestSignal(
  timeoutMs: number,
  providedSignal?: AbortSignal | null,
) {
  if (providedSignal) {
    return { signal: providedSignal, cleanup: () => undefined };
  }

  if (typeof AbortController === "undefined") {
    return { signal: undefined, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export async function serverApiRequest<T>(
  path: string,
  options?: ServerApiOptions,
): Promise<T> {
  const { token, timeoutMs, ...requestOptions } = options ?? {};
  const headers = new Headers(options?.headers ?? {});

  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { signal, cleanup } = createServerRequestSignal(
    timeoutMs ?? SERVER_API_TIMEOUT_MS,
    requestOptions.signal,
  );

  try {
    const response = await fetch(`${SERVER_API_URL}/api/v1${path}`, {
      ...requestOptions,
      headers,
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(
        text || `Request failed with status ${response.status}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } finally {
    cleanup();
  }
}

export async function serverApiRequestWithSession<T>(
  session: AuthSession,
  path: string,
  options?: Omit<ServerApiOptions, "token">,
): Promise<T> {
  return serverApiRequest<T>(path, {
    ...options,
    token: session.accessToken,
  });
}
