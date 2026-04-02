import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "./session-cookie";

export async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return decodeSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getServerSessionMode() {
  const session = await requireServerSession();
  return isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
}
