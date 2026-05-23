import type {
  DashboardBootstrapResponse,
  EmployeeProfileResponse,
} from "@smart/types";
import DashboardHome, {
  type DashboardInitialData,
} from "@/components/dashboard-home";
import { type AuthSession, isEmployeeOnlyRole } from "@/lib/auth";
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

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
  const initialData = await loadInitialDashboardBootstrap(session);

  return (
    <DashboardHome
      initialData={initialData}
      initialSession={session}
      mode={mode}
    />
  );
}
