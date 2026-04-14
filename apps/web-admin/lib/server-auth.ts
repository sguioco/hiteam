import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { isDemoAccessToken } from "./demo-mode";
import { serverApiRequestWithSession } from "./server-api";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "./session-cookie";

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
  } catch {
    return null;
  }
});

export async function getServerSession(): Promise<AuthSession | null> {
  return readValidatedServerSession();
}

export async function requireServerSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const rawSessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await getServerSession();

  if (!session) {
    redirect(rawSessionCookie ? "/login?force=1" : "/login");
  }

  return session;
}

export async function getServerSessionMode() {
  const session = await requireServerSession();
  return isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
}
