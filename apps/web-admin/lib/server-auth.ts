import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { isDemoAccessToken } from "./demo-mode";
import { serverApiRequestWithSession } from "./server-api";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "./session-cookie";

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 401
  );
}

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

const readValidatedServerSession = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const session = decodeSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  if (isDemoAccessToken(session.accessToken)) {
    return session;
  }

  try {
    await serverApiRequestWithSession(session, "/auth/me");
    return session;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null;
    }

    return session;
  }
});

export async function getServerSession(): Promise<AuthSession | null> {
  return readValidatedServerSession();
}

export async function requireServerSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const rawSessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await getServerSession();

  if (!session) {
    if (rawSessionCookie) {
      const returnTo = normalizeReturnTo(
        requestHeaders.get("x-smart-return-to"),
      );
      redirect(
        `/api/auth/refresh-session?next=${encodeURIComponent(returnTo)}`,
      );
    }

    redirect("/login");
  }

  return session;
}

export async function getServerSessionMode() {
  const session = await requireServerSession();
  return isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
}
