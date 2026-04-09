import type { AuthSession } from "./auth";

const SERVER_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";
const SERVER_API_TIMEOUT_MS = Number(process.env.INTERNAL_API_TIMEOUT_MS ?? 12000);

type ServerApiOptions = RequestInit & {
  token?: string;
};

export async function serverApiRequest<T>(
  path: string,
  options?: ServerApiOptions,
): Promise<T> {
  const headers = new Headers(options?.headers ?? {});

  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${SERVER_API_URL}/api/v1${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: options?.signal ?? AbortSignal.timeout(SERVER_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
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
