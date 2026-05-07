import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "./session-cookie";

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

async function readServerSessionCookie(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return decodeSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getServerSession(): Promise<AuthSession | null> {
  return readServerSessionCookie();
}

export async function getServerSessionSnapshot(): Promise<AuthSession | null> {
  return readServerSessionCookie();
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
