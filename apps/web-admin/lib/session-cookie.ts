import type { AuthSession } from "./auth";

export const SESSION_COOKIE_NAME = "smart_admin_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function toBase64Url(payload: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(payload, "utf8").toString("base64url");
  }

  const encoded = btoa(
    encodeURIComponent(payload).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    ),
  );

  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const decoded = atob(normalized);
  const percentEncoded = Array.from(decoded)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .join("");

  return decodeURIComponent(percentEncoded);
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    Boolean(candidate.user) &&
    typeof candidate.user?.id === "string" &&
    typeof candidate.user?.email === "string" &&
    typeof candidate.user?.tenantId === "string" &&
    Array.isArray(candidate.user?.roleCodes) &&
    typeof candidate.user?.workspaceAccessAllowed === "boolean"
  );
}

export function encodeSessionCookie(session: AuthSession) {
  return toBase64Url(JSON.stringify(session));
}

export function decodeSessionCookie(value?: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(value)) as unknown;
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
