import type {
  DashboardBootstrapResponse,
  EmployeeProfileResponse,
} from "@smart/types";
import { redirect } from "next/navigation";
import DashboardHome, {
  type DashboardInitialData,
} from "@/components/dashboard-home";
import { type AuthSession, isEmployeeOnlyRole } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import { getDemoDashboardBootstrap } from "@/lib/demo-api";
import { DEMO_ADMIN_EMAIL, isDemoAccessToken } from "@/lib/demo-mode";
import { serverApiRequestWithSession } from "@/lib/server-api";
import { requireServerSession } from "@/lib/server-auth";

async function loadInitialDashboardBootstrap(
  session: AuthSession,
): Promise<DashboardInitialData | null> {
  const isOwnerDemoAccount =
    session.user.email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;

  if (isDemoAccessToken(session.accessToken) || isOwnerDemoAccount) {
    return getDemoDashboardBootstrap(session.accessToken)
      .initialData as DashboardInitialData;
  }

  try {
    const snapshot = await serverApiRequestWithSession<
      DashboardBootstrapResponse<unknown, EmployeeProfileResponse | null>
    >(session, "/bootstrap/dashboard", {
      signal: AbortSignal.timeout(2500),
    });

    return snapshot.initialData as DashboardInitialData;
  } catch {
    return null;
  }
}

async function shouldOpenOrganizationSetup(session: AuthSession) {
  if (isEmployeeOnlyRole(session.user.roleCodes)) {
    return false;
  }

  if (isDemoAccessToken(session.accessToken)) {
    return false;
  }

  try {
    const snapshot = await serverApiRequestWithSession<{
      setup?: { configured?: boolean } | null;
    }>(session, "/bootstrap/organization", {
      signal: AbortSignal.timeout(2500),
    });

    return snapshot.setup?.configured === false;
  } catch {
    return false;
  }
}

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";

  if (await shouldOpenOrganizationSetup(session)) {
    redirect(toAdminHref("/organization"));
  }

  const initialData = await loadInitialDashboardBootstrap(session);

  return (
    <DashboardHome
      initialData={initialData}
      initialSession={session}
      mode={mode}
    />
  );
}
